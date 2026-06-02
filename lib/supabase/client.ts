/**
 * lib/supabase/client.ts — Browser Supabase Client
 *
 * Use this in Client Components ('use client').
 * Uses the anon key — RLS policies enforce row-level security.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
