import { NextResponse, type NextRequest } from 'next/server';

/**
 * Passes the ?lang= choice to server components as a request header, so the
 * root layout (which cannot read search params) can set <html lang> and the
 * page metadata in the reader's language.
 */
export function proxy(req: NextRequest) {
  const headers = new Headers(req.headers);
  const lang = req.nextUrl.searchParams.get('lang');
  if (lang) headers.set('x-emy-lang', lang);
  else headers.delete('x-emy-lang');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // pages only — not the API, Next internals, or static files
  matcher: ['/((?!api/|_next/|fonts/|.*\\.[a-z0-9]+$).*)'],
};
