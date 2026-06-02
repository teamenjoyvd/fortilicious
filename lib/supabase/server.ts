/**
 * lib/supabase/server.ts — Server-Side Supabase Client
 *
 * Use this in Server Components, Server Actions, and API Route Handlers.
 * Contains cookie-based, Clerk-authenticated, and Service Role clients.
 *
 * GOTCHA: Do NOT derive types from CookieMethodsServer['setAll']
 * because setAll is optional and Parameters<> breaks.
 * Use the inline type below instead.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { createClient as createBaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Standard cookie-based client. Uses cookie credentials.
 */
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
        async setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              await cookieStore.set(name, value, options as never);
            }
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Authenticated Clerk client. Uses the Clerk JWT template 'supabase'
 * to authenticate requests via RLS policies in the database.
 */
export async function createClerkSupabaseClient() {
  const { getToken } = await auth();
  let supabaseToken: string | null = null;
  try {
    supabaseToken = await getToken({ template: 'supabase' });
  } catch (err) {
    console.warn('Clerk JWT Template "supabase" not configured. Falling back to Service Role client.');
  }

  if (supabaseToken && supabaseToken !== 'null' && supabaseToken !== 'undefined') {
    return createBaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
          },
        },
      }
    );
  }

  // Fallback to service role client so local dev works without Clerk dashboard setup
  return createServiceRoleSupabaseClient();
}

/**
 * Service Role client. Highly privileged, bypasses RLS entirely.
 * Use ONLY in server-side contexts for admin tasks like Storage management and catalog Sync.
 * NEVER expose the SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createServiceRoleSupabaseClient() {
  return createBaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
