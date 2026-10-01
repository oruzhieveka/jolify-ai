/**
 * Fixed-window limiter per key. In-memory, so it is per server instance: adequate for
 * a single Netlify function region at MVP scale; replace with Upstash/Postgres for multi-region.
 */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs = 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return { ok: true, retryAfter: 0 }; }
  if (b.n >= limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  b.n++;
  return { ok: true, retryAfter: 0 };
}
