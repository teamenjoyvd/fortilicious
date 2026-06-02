'use server';

import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { createClient as createBaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to synchronize the Amway products catalog
 * from the external amway-price-checker database.
 */
export async function syncAmwayCatalog(): Promise<{ success: boolean; count?: number; error?: string }> {
  let userId = '';
  try {
    userId = await requireAuth();
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Initialize local admin client
  const localSupabase = createServiceRoleSupabaseClient();

  // 2. Try to acquire the session-level advisory lock
  const { data: locked, error: lockError } = await localSupabase.rpc('try_acquire_sync_lock');
  if (lockError) {
    console.warn('Sync Advisory Lock acquisition failed:', lockError);
    if (lockError.message.includes('does not exist') || lockError.code === 'PGRST202') {
      return { 
        success: false, 
        error: 'Database schema is not initialized. Please copy and run the contents of supabase/unified_schema.sql in your Supabase Dashboard SQL Editor first!' 
      };
    }
    return { success: false, error: `Database error: ${lockError.message}` };
  }
  
  if (!locked) {
    return { success: false, error: 'Catalog synchronization is already in progress. Please wait.' };
  }

  const currentSyncStart = new Date().toISOString();

  try {
    const syncSite = process.env.AMWAY_SYNC_SITE || 'Bulgaria';
    const checkerUrl = process.env.AMWAY_CHECKER_SUPABASE_URL;
    const checkerKey = process.env.AMWAY_CHECKER_SUPABASE_ANON_KEY;

    if (!checkerUrl || !checkerKey) {
      throw new Error('Amway price checker connection parameters are not configured in environment.');
    }

    // 3. Connect to external checker database
    const checkerSupabase = createBaseClient(checkerUrl, checkerKey);

    // 4. Fetch catalog records in parallel
    const [mastersRes, sourcesRes, linksRes] = await Promise.all([
      checkerSupabase.from('master_products').select('id, numeric_sku, name, description, category'),
      checkerSupabase.from('source_products').select('id, sku, site, price, wholesale_price, currency, pv, brand, url, status').eq('site', syncSite),
      checkerSupabase.from('product_links').select('master_product_id, source_product_id'),
    ]);

    if (mastersRes.error || sourcesRes.error || linksRes.error) {
      throw new Error(
        `Failed to fetch from Checker source: ${
          mastersRes.error?.message || sourcesRes.error?.message || linksRes.error?.message
        }`
      );
    }

    const masters = mastersRes.data || [];
    const sources = sourcesRes.data || [];
    const links = linksRes.data || [];

    if (masters.length === 0 || sources.length === 0) {
      return { success: true, count: 0, error: `No active items found on Checker catalog for site: "${syncSite}".` };
    }

    // 5. Build lookup maps in JavaScript for fast O(1) joins
    const mastersById = new Map(masters.map((m) => [m.id, m]));
    const linksBySourceId = new Map(links.map((l) => [l.source_product_id, l.master_product_id]));

    // Fetch local products to identify sync-locked ones
    const { data: localProducts } = await localSupabase
      .from('products')
      .select('numeric_sku, sync_locked')
      .eq('user_id', userId)
      .eq('source', 'amway-price-checker');

    const syncLockedSkus = new Set(
      (localProducts || [])
        .filter((lp) => lp.sync_locked && lp.numeric_sku)
        .map((lp) => lp.numeric_sku)
    );

    // 6. Map and merge product listings
    const upsertItems: any[] = [];
    
    for (const source of sources) {
      const masterId = linksBySourceId.get(source.id);
      if (!masterId) continue;

      const master = mastersById.get(masterId);
      if (!master || !master.numeric_sku) continue;

      // Skip row if user manually locked pricing updates
      if (syncLockedSkus.has(master.numeric_sku)) {
        continue;
      }

      // Map Checker schema columns to local Fortilicious columns
      upsertItems.push({
        user_id: userId,
        name: master.name,
        brand: 'amway',
        category: master.category || 'General',
        numeric_sku: master.numeric_sku,
        price: source.price,
        wholesale_price: source.wholesale_price || null,
        currency: source.currency,
        pv: source.pv || 0,
        description: master.description || null,
        image_url: null, // Scraper doesn't hold product images
        source_url: source.url || null,
        amway_brand: source.brand || null,
        source: 'amway-price-checker',
        active: source.status === 'active' || source.status === 'out_of_stock',
        sync_locked: false,
        last_synced_at: currentSyncStart,
      });
    }

    // 7. Bulk upsert mapped listings in chunks to ensure clean transactions
    if (upsertItems.length > 0) {
      const { error: upsertError } = await localSupabase
        .from('products')
        .upsert(upsertItems, { onConflict: 'numeric_sku' });

      if (upsertError) {
        throw new Error(`Failed to upsert local listings: ${upsertError.message}`);
      }
    }

    // 8. Tombstone un-synced products (discontinued items)
    // Any item whose last_synced_at is less than our run start time is tombstoned
    const { error: tombstoneError } = await localSupabase
      .from('products')
      .update({ active: false })
      .eq('user_id', userId)
      .eq('source', 'amway-price-checker')
      .or(`last_synced_at.lt.${currentSyncStart},last_synced_at.is.null`);

    if (tombstoneError) {
      console.error('Tombstoning discontinued products warning:', tombstoneError.message);
    }

    // 9. Fetch rich details (image and description) from amway.bg for new/updated products
    const { data: unEnrichedProducts } = await localSupabase
      .from('products')
      .select('id, source_url')
      .eq('user_id', userId)
      .eq('source', 'amway-price-checker')
      .or('image_url.is.null,description.is.null');

    if (unEnrichedProducts && unEnrichedProducts.length > 0) {
      console.log(`Enriching details for ${unEnrichedProducts.length} items from amway.bg...`);
      const batchSize = 15;
      for (let i = 0; i < unEnrichedProducts.length; i += batchSize) {
        const batch = unEnrichedProducts.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (prod) => {
            if (!prod.source_url) return;
            const details = await fetchAmwayProductDetails(prod.source_url);
            if (details) {
              await localSupabase
                .from('products')
                .update({
                  image_url: details.imageUrl,
                  description: details.description,
                })
                .eq('id', prod.id);
            }
          })
        );
      }
      console.log('Enrichment completed.');
    }

    revalidatePath('/products');
    revalidatePath('/');

    return { success: true, count: upsertItems.length };
  } catch (err: any) {
    console.error('syncAmwayCatalog Failed:', err);
    return { success: false, error: err.message || 'Catalog sync failed' };
  } finally {
    // 10. Safeguard: always release the session advisory lock
    const { error: unlockError } = await localSupabase.rpc('release_sync_lock');
    if (unlockError) {
      console.error('Warning: Failed to release advisory lock:', unlockError.message);
    }
  }
}

function stripHtml(htmlStr: string): string {
  return htmlStr
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAmwayProductDetails(url: string): Promise<{ imageUrl: string | null; description: string | null } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'bg-BG,bg;q=0.9,en-US;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract og:image
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i) || 
                         html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:image"/i);
    const imageUrl = ogImageMatch ? ogImageMatch[1].trim() : null;

    // Extract description from hydration json state
    let description: string | null = null;
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const content = match[1];
      if (content.includes('sectionTypeCode')) {
        try {
          const parsed = JSON.parse(content);
          const pd = parsed?.props?.initialStateOrStore?.PDPState?.productData;
          if (pd && pd.productSections) {
            const overviewSec = pd.productSections.find((s: any) => s.sectionTypeCode === 'overview');
            if (overviewSec && overviewSec.content) {
              description = stripHtml(overviewSec.content);
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    }

    return { imageUrl, description };
  } catch (err) {
    console.error(`Failed to fetch details for ${url}:`, err);
    return null;
  }
}
