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

/**
 * The client address as reported by the reverse proxy. Only proxy-written
 * values are trusted: X-Real-IP (which the proxy overwrites), else the LAST
 * X-Forwarded-For entry (the one the proxy appended). The first entry is
 * whatever the client sent and must never be used — spoofing it would
 * give every request a fresh rate-limit bucket.
 */
export function clientIp(req: { headers: Headers }): string {
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean);
  return forwarded?.length ? forwarded[forwarded.length - 1] : 'unknown';
}

/** Standard 429 response, or null when the request may proceed. */
export function limited(req: { headers: Headers }, bucket: string, limit: number, windowMs: number): Response | null {
  return rateLimit(`${bucket}:${clientIp(req)}`, limit, windowMs)
    ? null
    : Response.json({ error: 'rate limited' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } });
}
