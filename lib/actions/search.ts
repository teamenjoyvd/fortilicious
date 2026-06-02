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
 * Searches across content pillars.
 * Restricts queries to the authenticated user's records under RLS.
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const userId = await requireAuth();
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const supabase = await createClerkSupabaseClient();

  // Search content pillars using simple text matching configuration.
  const { data, error } = await supabase
    .from('content_pillars')
    .select('id, title, description')
    .textSearch('search_vector', trimmedQuery, {
      config: 'simple',
      type: 'websearch'
    })
    .limit(20);

  if (error) {
    console.error('searchAll Error:', error);
    return [];
  }

  return (data || []).map((row) => {
    // Generate a simple excerpt for the snippet
    const desc = row.description || '';
    const queryIndex = desc.toLowerCase().indexOf(trimmedQuery.toLowerCase());
    let snippet = desc;

    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 40);
      const end = Math.min(desc.length, queryIndex + trimmedQuery.length + 60);
      snippet = (start > 0 ? '...' : '') + desc.slice(start, end) + (end < desc.length ? '...' : '');
    } else if (desc.length > 100) {
      snippet = desc.slice(0, 100) + '...';
    }

    return {
      type: 'pillar',
      id: row.id,
      title: row.title,
      snippet,
      url: `/pillars/${row.id}`
    };
  });
}
