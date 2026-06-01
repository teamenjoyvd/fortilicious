/**
 * lib/supabase/server.ts — Server-Side Supabase Client
 *
 * Use this in Server Components, Server Actions, and API Route Handlers.
 * Uses the anon key with cookie-based auth — RLS policies enforce security.
 *
 * GOTCHA: Do NOT derive types from CookieMethodsServer['setAll']
 * because setAll is optional and Parameters<> breaks.
 * Use the inline type below instead.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as never)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
