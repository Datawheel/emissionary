/**
 * Minimal fixed-window rate limiter (spec §12) — in-memory per process.
 * Casual-cheating deterrent, not a bulletproof system (per spec).
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  w.count += 1;
  if (windows.size > 50_000) {
    for (const [k, v] of windows) if (now >= v.resetAt) windows.delete(k);
  }
  return w.count <= limit;
}

export function clientIp(req: { headers: Headers }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
