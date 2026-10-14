/**
 * Content-Security-Policy, shared by next.config.mjs (static headers, fixed at
 * build time) and src/proxy.ts (recomputed per page request, so EMBED_PARENTS
 * can be set at runtime without rebuilding the image).
 *
 * script-src needs 'unsafe-inline' for Next's inline hydration scripts; React
 * escapes all rendered text, and the policy still blocks scripts, frames and
 * requests to any other origin. Dev mode additionally needs 'unsafe-eval'.
 */

/**
 * Extra origins allowed to embed the game (EMBED_PARENTS, comma-separated), on
 * top of oec.world. Empty by default: it exists to test a production build
 * against a local OEC site (EMBED_PARENTS=http://localhost:3000). Anything that
 * is not a plain http(s) origin is dropped, so the value cannot inject CSP
 * directives or widen the policy with wildcards.
 * @param {string | undefined} raw
 * @returns {string[]}
 */
export function parseEmbedParents(raw) {
  const origins = new Set();
  for (const part of (raw ?? '').split(',')) {
    const value = part.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      // URL tolerates '*' and ';' in hosts; a CSP source must not
      const plainHost = /^[a-z0-9.-]+$/i.test(url.hostname) || url.hostname === '[::1]';
      if ((url.protocol === 'http:' || url.protocol === 'https:') && plainHost) origins.add(url.origin);
    } catch {
      /* not a URL: ignore */
    }
  }
  return [...origins];
}

/**
 * Embedded by the OEC games hub (oec.world). Dev also allows the local OEC site.
 * @param {{ dev: boolean, embedParents?: string }} options
 */
export function buildCsp({ dev, embedParents }) {
  const frameAncestors = [
    "'self'",
    ...(dev ? ['http://localhost:3000'] : ['https://oec.world', 'https://*.oec.world']),
    ...parseEmbedParents(embedParents),
  ].join(' ');
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
}
