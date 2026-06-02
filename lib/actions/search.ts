'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';

export type SearchResult = {
  type: 'pillar' | 'content_piece' | 'product' | 'research_entry';
  id: string;
  title: string;
  snippet: string;
  url: string;
};

/**
 * Searches across content pillars and products.
 * Restricts queries to the authenticated user's records under RLS.
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const userId = await requireAuth();
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const supabase = await createClerkSupabaseClient();

  // Search content pillars, products, and research entries concurrently
  const [pillarsRes, productsRes, researchRes] = await Promise.all([
    supabase
      .from('content_pillars')
      .select('id, title, description')
      .textSearch('search_vector', trimmedQuery, {
        config: 'simple',
        type: 'websearch'
      })
      .limit(10),
    supabase
      .from('products')
      .select('id, name, description, category, brand, numeric_sku')
      .textSearch('search_vector', trimmedQuery, {
        config: 'simple',
        type: 'websearch'
      })
      .limit(10),
    supabase
      .from('research_entries')
      .select('id, title, body, url, type, pillar_id')
      .textSearch('search_vector', trimmedQuery, {
        config: 'simple',
        type: 'websearch'
      })
      .limit(10)
  ]);

  const searchMatches: SearchResult[] = [];

  // Parse Content Pillars
  if (!pillarsRes.error && pillarsRes.data) {
    pillarsRes.data.forEach((row) => {
      const desc = row.description || '';
      const queryIndex = desc.toLowerCase().indexOf(trimmedQuery.toLowerCase());
      let snippet = desc;

      if (queryIndex !== -1) {
        const start = Math.max(0, queryIndex - 40);
        const end = Math.min(desc.length, queryIndex + trimmedQuery.length + 60);
        snippet = (start > 0 ? '...' : '') + desc.slice(start, end) + (end < desc.length ? '...' : '');
      } else if (desc.length > 80) {
        snippet = desc.slice(0, 80) + '...';
      }

      searchMatches.push({
        type: 'pillar',
        id: row.id,
        title: row.title,
        snippet,
        url: `/pillars/${row.id}`
      });
    });
  }

  // Parse Products Catalog
  if (!productsRes.error && productsRes.data) {
    productsRes.data.forEach((row) => {
      const desc = row.description || '';
      const queryIndex = desc.toLowerCase().indexOf(trimmedQuery.toLowerCase());
      let snippet = desc;

      if (queryIndex !== -1) {
        const start = Math.max(0, queryIndex - 40);
        const end = Math.min(desc.length, queryIndex + trimmedQuery.length + 60);
        snippet = (start > 0 ? '...' : '') + desc.slice(start, end) + (end < desc.length ? '...' : '');
      } else if (desc.length > 80) {
        snippet = desc.slice(0, 80) + '...';
      } else if (!desc && row.category) {
        snippet = `Category: ${row.category} | Brand: ${row.brand}`;
      }

      const skuText = row.numeric_sku ? ` [SKU: ${row.numeric_sku}]` : '';

      searchMatches.push({
        type: 'product',
        id: row.id,
        title: `${row.name}${skuText}`,
        snippet,
        url: `/products` // catalog bottom sheet details will open on click
      });
    });
  }

  // Parse Research Entries
  if (!researchRes.error && researchRes.data) {
    researchRes.data.forEach((row) => {
      const desc = row.body || row.url || '';
      const queryIndex = desc.toLowerCase().indexOf(trimmedQuery.toLowerCase());
      let snippet = desc;

      if (queryIndex !== -1) {
        const start = Math.max(0, queryIndex - 40);
        const end = Math.min(desc.length, queryIndex + trimmedQuery.length + 60);
        snippet = (start > 0 ? '...' : '') + desc.slice(start, end) + (end < desc.length ? '...' : '');
      } else if (desc.length > 80) {
        snippet = desc.slice(0, 80) + '...';
      }

      searchMatches.push({
        type: 'research_entry',
        id: row.id,
        title: row.title || (row.type === 'link' ? 'Link Bookmark' : 'Research Note'),
        snippet,
        url: `/pillars/${row.pillar_id}?tab=research`
      });
    });
  }

  return searchMatches.slice(0, 20);
}
