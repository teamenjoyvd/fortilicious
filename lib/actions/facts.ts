'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth, createRateLimiter } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

// Global rate limiter instance: 1 request per 60 seconds per product ID
const scrapeLimiter = createRateLimiter(1, 60 * 1000);

function determineCategory(title: string, body: string): 'benefit' | 'science' | 'usage' | 'fun_fact' | 'general' {
  const text = (title + ' ' + body).toLowerCase();
  if (text.includes('study') || text.includes('clinical') || text.includes('proven') || text.includes('research') || text.includes('science')) {
    return 'science';
  }
  if (text.includes('benefit') || text.includes('improve') || text.includes('boost') || text.includes('prevent') || text.includes('healthy') || text.includes('support')) {
    return 'benefit';
  }
  if (text.includes('use') || text.includes('take') || text.includes('directions') || text.includes('dosage') || text.includes('consume') || text.includes('apply')) {
    return 'usage';
  }
  if (text.includes('did you know') || text.includes('fun fact') || text.includes('interesting') || text.includes('history')) {
    return 'fun_fact';
  }
  return 'general';
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&trade;/g, '™')
    .replace(/&reg;/g, '®')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Server Action to scrape DuckDuckGo for product facts and enrich product knowledge.
 */
export async function fetchProductInternetFacts(productId: string): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const userId = await requireAuth();

    // Check rate limiter
    const allowed = scrapeLimiter(productId);
    if (!allowed) {
      return { success: false, error: 'Rate limit exceeded: please wait 60 seconds between internet searches.' };
    }

    const supabase = await createClerkSupabaseClient();

    // Fetch product details
    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('name, brand')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (prodError || !product) {
      return { success: false, error: 'Product not found or access denied.' };
    }

    // Query DuckDuckGo
    const query = encodeURIComponent(`${product.name} benefits science facts`);
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${query}`;

    const ddgRes = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!ddgRes.ok) {
      return { success: false, error: 'Failed to query search engine.' };
    }

    const html = await ddgRes.text();
    const parts = html.split('<div class="result results_links results_links_deep web-result ">');
    const rawResults: { title: string; url: string; snippet: string }[] = [];

    for (let i = 1; i < parts.length && rawResults.length < 5; i++) {
      const part = parts[i];
      const aMatch = part.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!aMatch) continue;

      const rawHref = aMatch[1];
      const rawTitle = aMatch[2];

      let targetUrl = rawHref;
      try {
        if (rawHref.startsWith('//')) {
          targetUrl = 'https:' + rawHref;
        }
        const urlObj = new URL(targetUrl);
        const uddg = urlObj.searchParams.get('uddg');
        if (uddg) {
          targetUrl = decodeURIComponent(uddg);
        }
      } catch (err) {
        // Fallback to original url
      }

      const title = cleanHtmlEntities(rawTitle.replace(/<[^>]+>/g, ''));
      const snippetMatch = part.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      const snippet = snippetMatch ? cleanHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '')) : '';

      rawResults.push({ title, url: targetUrl, snippet });
    }

    if (rawResults.length === 0) {
      return { success: true, count: 0 };
    }

    const factsToInsert: any[] = [];

    // Process top 3 with external fetch, the rest fall back to snippet
    for (let idx = 0; idx < rawResults.length; idx++) {
      const result = rawResults[idx];
      let factBody = result.snippet;
      let factTitle = result.title;
      let sourceTitle = '';

      try {
        const urlObj = new URL(result.url);
        sourceTitle = urlObj.hostname.replace('www.', '');
      } catch (e) {
        sourceTitle = 'Web Link';
      }

      // Only fetch externally for top 3 results
      if (idx < 3) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
          const extRes = await fetch(result.url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          if (extRes.ok) {
            const extHtml = await extRes.text();

            // Extract title if possible
            const titleMatch = extHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              factTitle = cleanHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, ''));
            }

            // Strip scripts/styles and get plain text
            let text = extHtml.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
            text = text.replace(/<[^>]+>/g, ' ');
            text = cleanHtmlEntities(text);

            // Split to sentences and match health/science keywords
            const sentences = text
              .split(/[.!?]\s+/)
              .map(s => s.trim())
              .filter(s => s.length > 25 && s.length < 250);

            const keywords = ['science', 'study', 'proven', 'research', 'clinical', 'benefit', 'support', 'health', 'vitamin', 'mineral', 'immunity', 'antioxidant', 'boost', 'prevention'];
            const matching = sentences.filter(s => {
              const lower = s.toLowerCase();
              return keywords.some(kw => lower.includes(kw));
            });

            if (matching.length > 0) {
              // Combine top 2 matching sentences
              factBody = matching.slice(0, 2).join('. ') + '.';
            }
          }
        } catch (err) {
          // Fall back silently to result snippet
        } finally {
          clearTimeout(timeoutId);
        }
      }

      // Fallback in case body became empty
      if (!factBody.trim()) {
        factBody = result.snippet || 'No details available.';
      }

      const category = determineCategory(factTitle, factBody);

      factsToInsert.push({
        product_id: productId,
        user_id: userId,
        source_type: 'external_scraped',
        category,
        title: factTitle.substring(0, 100), // safe truncation for title
        body: factBody,
        source_title: sourceTitle,
        source_url: result.url,
        approved: false // curation required
      });
    }

    // Upsert database entries with ON CONFLICT DO NOTHING (ignoreDuplicates)
    const { error: upsertError } = await supabase
      .from('product_facts')
      .upsert(factsToInsert, {
        onConflict: 'product_id,source_url',
        ignoreDuplicates: true
      });

    if (upsertError) {
      console.error('fetchProductInternetFacts Upsert Error:', upsertError);
      return { success: false, error: upsertError.message };
    }

    revalidatePath(`/products/${productId}`);
    return { success: true, count: factsToInsert.length };

  } catch (err: any) {
    console.error('fetchProductInternetFacts Error:', err);
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to approve a product fact.
 */
export async function approveProductFact(factId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();
    const supabase = await createClerkSupabaseClient();

    // Find the product_id of the fact first to revalidate correctly
    const { data: fact, error: findError } = await supabase
      .from('product_facts')
      .select('product_id')
      .eq('id', factId)
      .eq('user_id', userId)
      .single();

    if (findError || !fact) {
      return { success: false, error: 'Fact not found or access denied.' };
    }

    const { error: updateError } = await supabase
      .from('product_facts')
      .update({ approved: true })
      .eq('id', factId)
      .eq('user_id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/products/${fact.product_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to create a manual knowledge card/fact.
 */
export async function createManualFact(
  productId: string,
  category: 'benefit' | 'science' | 'usage' | 'fun_fact' | 'general',
  title: string,
  body: string,
  sourceTitle?: string,
  sourceUrl?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!title.trim() || !body.trim()) {
      return { success: false, error: 'Title and body are required.' };
    }

    const supabase = await createClerkSupabaseClient();

    // Verify product ownership (triggers check this but it's good UX to do it in action too)
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', userId)
      .single();

    if (!product) {
      return { success: false, error: 'Product not found or access denied.' };
    }

    const { data, error } = await supabase
      .from('product_facts')
      .insert({
        product_id: productId,
        user_id: userId,
        source_type: 'manual_entry',
        category,
        title: title.trim(),
        body: body.trim(),
        source_title: sourceTitle?.trim() || null,
        source_url: sourceUrl?.trim() || null,
        approved: true // manual entries are automatically approved
      })
      .select('id')
      .single();

    if (error) {
      console.error('createManualFact Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/products/${productId}`);
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to update a product fact's details.
 */
export async function updateProductFact(
  factId: string,
  updates: {
    category?: 'benefit' | 'science' | 'usage' | 'fun_fact' | 'general';
    title?: string;
    body?: string;
    source_title?: string;
    source_url?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();
    const supabase = await createClerkSupabaseClient();

    // Find the product_id of the fact first to revalidate correctly
    const { data: fact, error: findError } = await supabase
      .from('product_facts')
      .select('product_id')
      .eq('id', factId)
      .eq('user_id', userId)
      .single();

    if (findError || !fact) {
      return { success: false, error: 'Fact not found or access denied.' };
    }

    const cleanUpdates: any = {};
    if (updates.category) cleanUpdates.category = updates.category;
    if (updates.title) cleanUpdates.title = updates.title.trim();
    if (updates.body) cleanUpdates.body = updates.body.trim();
    if (updates.source_title !== undefined) cleanUpdates.source_title = updates.source_title?.trim() || null;
    if (updates.source_url !== undefined) cleanUpdates.source_url = updates.source_url?.trim() || null;

    const { error: updateError } = await supabase
      .from('product_facts')
      .update(cleanUpdates)
      .eq('id', factId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('updateProductFact Error:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath(`/products/${fact.product_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a product fact.
 */
export async function deleteProductFact(factId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();
    const supabase = await createClerkSupabaseClient();

    // Find the product_id of the fact first to revalidate correctly
    const { data: fact, error: findError } = await supabase
      .from('product_facts')
      .select('product_id')
      .eq('id', factId)
      .eq('user_id', userId)
      .single();

    if (findError || !fact) {
      return { success: false, error: 'Fact not found or access denied.' };
    }

    const { error: deleteError } = await supabase
      .from('product_facts')
      .delete()
      .eq('id', factId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('deleteProductFact Error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    revalidatePath(`/products/${fact.product_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
