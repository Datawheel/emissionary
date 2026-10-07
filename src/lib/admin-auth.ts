import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * /admin access. The password is POSTed once (never in a URL, so it stays out
 * of history, proxy logs and referrers) and exchanged for a signed session
 * cookie. In production there is no default: without ADMIN_KEY, admin is off.
 */
export const ADMIN_COOKIE = 'emy_admin';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

/** The value shipped in .env.example — never a valid production password. */
export const ADMIN_KEY_PLACEHOLDER = 'change_me_admin_key';

export function adminKey(): string | null {
  const key = process.env.ADMIN_KEY;
  const production = process.env.NODE_ENV === 'production';
  if (key && !(production && key === ADMIN_KEY_PLACEHOLDER)) return key;
  return production ? null : 'dev-admin'; // local development only
}

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Constant-time password check (hashing first equalizes lengths). */
export function passwordMatches(given: string): boolean {
  const key = adminKey();
  return key != null && timingSafeEqual(digest(given), digest(key));
}

/** Session value: bound to the current password and the server secret, so changing either logs admins out. */
export function sessionValue(): string | null {
  const key = adminKey();
  if (!key) return null;
  return createHmac('sha256', process.env.PLAYER_TOKEN_SECRET ?? 'change_me_dev_secret').update(`admin:${key}`).digest('hex');
}

export function validSession(cookie: string | undefined): boolean {
  const expected = sessionValue();
  return !!cookie && expected != null && timingSafeEqual(digest(cookie), digest(expected));
}
