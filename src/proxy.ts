import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp } from '@/lib/csp.mjs';

/**
 * Passes the ?lang= choice to server components as a request header, so the
 * root layout (which cannot read search params) can set <html lang> and the
 * page metadata in the reader's language. It also sets the CSP on pages at
 * request time, so EMBED_PARENTS works without rebuilding (see src/lib/csp.mjs).
 */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  const lang = req.nextUrl.searchParams.get('lang');
  if (lang) headers.set('x-emy-lang', lang);
  else headers.delete('x-emy-lang');
  const res = NextResponse.next({ request: { headers } });
  res.headers.set(
    'Content-Security-Policy',
    buildCsp({ dev: process.env.NODE_ENV !== 'production', embedParents: process.env.EMBED_PARENTS }),
  );
  return res;
}

export const config = {
  // pages only — not the API, Next internals, or static files
  matcher: ['/((?!api/|_next/|fonts/|.*\\.[a-z0-9]+$).*)'],
};
