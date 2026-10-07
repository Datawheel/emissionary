import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, passwordMatches, sessionValue } from '@/lib/admin-auth';
import { limited } from '@/lib/ratelimit';

/** Form POST from /admin: checks the password, sets the session cookie, returns to /admin. */
export async function POST(req: NextRequest) {
  const tooMany = limited(req, 'admin-login', 10, 15 * 60 * 1000);
  if (tooMany) return tooMany;
  const form = await req.formData().catch(() => null);
  const password = form?.get('password');
  const ok = typeof password === 'string' && password.length <= 200 && passwordMatches(password);
  // relative Location: behind a reverse proxy req.url carries the internal host/port
  const res = new NextResponse(null, { status: 303, headers: { Location: ok ? '/admin' : '/admin?error=1' } });
  if (ok) {
    res.cookies.set(ADMIN_COOKIE, sessionValue()!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_SECONDS,
    });
  }
  return res;
}
