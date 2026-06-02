/**
 * lib/proxy.ts — Custom API Proxy & Routing Logic
 *
 * All custom edge routing, request rewriting, and proxy logic lives here.
 * Root middleware.ts is reserved ONLY for Clerk's clerkMiddleware().
 *
 * Usage: Import and call from API route handlers or server actions.
 */

import { auth } from '@clerk/nextjs/server';

/**
 * Verify authentication and return the userId.
 * Use at the top of every protected API route handler.
 *
 * @throws Returns null if user is not authenticated
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

/**
 * Example: Rate limiting helper (extend as needed)
 * Add custom proxy logic here — NOT in middleware.ts
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return function checkRate(identifier: string): boolean {
    const now = Date.now();
    const record = requests.get(identifier);

    if (!record || now > record.resetAt) {
      requests.set(identifier, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  };
}
