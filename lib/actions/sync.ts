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
  if (lockError || !locked) {
    console.warn('Sync Advisory Lock acquisition failed or rejected:', lockError);
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
    const sourcesById = new Map(sources.map((s) => [s.id, s]));
    const linksByMasterId = new Map(links.map((l) => [l.master_product_id, l.source_product_id]));

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
    
    for (const master of masters) {
      if (!master.numeric_sku) continue;

      // Skip row if user manually locked pricing updates
      if (syncLockedSkus.has(master.numeric_sku)) {
        continue;
      }

      const sourceId = linksByMasterId.get(master.id);
      if (!sourceId) continue;

      const source = sourcesById.get(sourceId);
      if (!source) continue;

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

    revalidatePath('/products');
    revalidatePath('/');

    return { success: true, count: upsertItems.length };
  } catch (err: any) {
    console.error('syncAmwayCatalog Failed:', err);
    return { success: false, error: err.message || 'Catalog sync failed' };
  } finally {
    // 9. Safeguard: always release the session advisory lock
    const { error: unlockError } = await localSupabase.rpc('release_sync_lock');
    if (unlockError) {
      console.error('Warning: Failed to release advisory lock:', unlockError.message);
    }
  }
}
