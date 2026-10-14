import { headers } from 'next/headers';
import { parseConsent, parseTheme, type Theme } from './embed';

/** Theme and consent for the current page, as forwarded by src/proxy.ts. */
export async function requestEmbed(): Promise<{ theme: Theme; consent: boolean }> {
  const h = await headers();
  return {
    theme: parseTheme(h.get('x-emy-theme')),
    consent: parseConsent(h.get('x-emy-consent')),
  };
}
