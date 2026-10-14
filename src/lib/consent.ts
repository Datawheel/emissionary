import { cookies, headers } from 'next/headers';
import { CONSENT_COOKIE } from './embed';

export { CONSENT_COOKIE };

/**
 * Whether this request may persist anything about the visitor.
 *
 * Page requests carry `x-emy-proxy` / `x-emy-consent`, which the proxy sets
 * after stripping whatever the client sent. API routes are not given those
 * headers, so they honor only the cookie the proxy set when the embedding
 * page was opened with consent=true. A forged header on /api cannot grant it.
 */
export async function hasConsent(): Promise<boolean> {
  const h = await headers();
  if (h.get('x-emy-proxy') === '1') return h.get('x-emy-consent') === 'true';
  return (await cookies()).get(CONSENT_COOKIE)?.value === '1';
}
