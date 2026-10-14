import { buildCsp } from './src/lib/csp.mjs';

/**
 * Security headers ship with the app itself, so they apply behind any proxy.
 * The CSP lives in src/lib/csp.mjs; pages get it recomputed at runtime by
 * src/proxy.ts (EMBED_PARENTS), the build-time value here covers everything else.
 */
const dev = process.env.NODE_ENV !== 'production';
// ads: true here only so this header does not veto the per-request CSP from
// src/proxy.ts. That one includes AdSense hosts solely when ?consent=true.
const csp = buildCsp({ dev, embedParents: process.env.EMBED_PARENTS, ads: true });

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // never cache or index the admin page or the login endpoint
      {
        source: '/(admin|api/admin)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
