import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp } from '@/lib/csp.mjs';
import { CONSENT_COOKIE, PLAYER_COOKIE, parseConsent, parseTheme } from '@/lib/embed';

/**
 * Forwards ?lang=, ?theme= and ?consent= to server components as request
 * headers (the root layout cannot read search params). Page responses also
 * get a CSP that allows AdSense only when consent=true, and a consent cookie
 * the API checks before it writes anything about the visitor.
 *
 * API routes are included so a client cannot send x-emy-consent itself: those
 * headers are stripped and never re-set. Cookies are not touched on /api.
 */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.delete('x-emy-lang');
  headers.delete('x-emy-theme');
  headers.delete('x-emy-consent');
  headers.delete('x-emy-proxy');

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next({ request: { headers } });
  }

  const lang = req.nextUrl.searchParams.get('lang');
  if (lang) headers.set('x-emy-lang', lang);
  const theme = parseTheme(req.nextUrl.searchParams.get('theme'));
  const consent = parseConsent(req.nextUrl.searchParams.get('consent'));
  headers.set('x-emy-theme', theme);
  headers.set('x-emy-consent', consent ? 'true' : 'false');
  headers.set('x-emy-proxy', '1');

  const res = NextResponse.next({ request: { headers } });
  res.headers.set(
    'Content-Security-Policy',
    buildCsp({ dev: process.env.NODE_ENV !== 'production', embedParents: process.env.EMBED_PARENTS, ads: consent }),
  );

  const base = {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  };
  if (consent) {
    res.cookies.set(CONSENT_COOKIE, '1', { ...base, maxAge: 60 * 60 * 24 });
  } else {
    // Direct visits and consent=false keep no identity and no permission to store one.
    res.cookies.set(CONSENT_COOKIE, '', { ...base, maxAge: 0 });
    res.cookies.set(PLAYER_COOKIE, '', { ...base, maxAge: 0 });
  }
  return res;
}

export const config = {
  // pages and API — not Next internals or static files. API is included only
  // to strip the embed headers (see above).
  matcher: ['/((?!_next/|fonts/|.*\\.[a-z0-9]+$).*)'],
};
