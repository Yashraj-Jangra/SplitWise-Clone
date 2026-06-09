/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * Usage:
 *   const result = rateLimit(identifier, { limit: 10, windowMs: 60_000 });
 *   if (!result.success) return new Response('Too many requests', { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Module-level store — survives across requests within the same serverless instance.
// Not suitable for multi-instance deployments (use Redis/Upstash for that).
const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent unbounded memory growth.
// Runs at most once per minute.
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check and increment rate limit for an identifier (e.g. IP + route).
 * Returns { success: false } when the limit is exceeded.
 */
export function rateLimit(
  identifier: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  maybeCleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // First request in this window
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Helper: get caller IP from a Next.js Request object.
 * Falls back to 'unknown' if headers are not available.
 */
export function getCallerIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Pre-configured rate limit profiles.
 *
 * Usage: rateLimitProfiles.standard(ip)
 */
export const rateLimitProfiles = {
  /** General API routes — 30 req/min */
  standard: (id: string) => rateLimit(id, { limit: 30, windowMs: 60_000 }),
  /** Sensitive routes (email, push, admin actions) — 5 req/min */
  sensitive: (id: string) => rateLimit(id, { limit: 5, windowMs: 60_000 }),
  /** Auth routes — 10 req/min */
  auth: (id: string) => rateLimit(id, { limit: 10, windowMs: 60_000 }),
};
