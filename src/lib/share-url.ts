import type { Lang } from './types';

/**
 * The OEC wrapper's host from a referrer, or null. Embedded in the OEC hub the
 * share text points at the wrapper page, not the bare game host. The game learns
 * the parent from document.referrer (same approach as World Trade Cup) and only
 * trusts OEC origins (localhost too in dev).
 */
export function wrapperHost(referrer: string | null | undefined, dev: boolean): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    const oec = u.protocol === 'https:' && (u.hostname === 'oec.world' || u.hostname.endsWith('.oec.world'));
    const local = dev && u.protocol === 'http:' && u.hostname === 'localhost';
    return oec || local ? u.host : null;
  } catch {
    return null;
  }
}

/** The wrapper page for a language; the wrapper has just en/es. Host + path, no scheme. */
export function wrapperPage(host: string, lang: Lang): string {
  return `${host}/${lang === 'es' ? 'es' : 'en'}/games/emissionary`;
}

const HOST_KEY = 'emy:wrapper-host';

/**
 * Client only. Call on app load: document.referrer is the wrapper only on the
 * entry page (a reload or in-game navigation replaces it), so keep it for the session.
 */
export function captureWrapperHost(): void {
  try {
    const host = wrapperHost(document.referrer, process.env.NODE_ENV !== 'production');
    if (host) sessionStorage.setItem(HOST_KEY, host);
  } catch {
    /* storage blocked: the share text falls back to this host */
  }
}

/** Client only. What the share text prints: the wrapper page when embedded, else this host. */
export function shareAddress(lang: Lang): string {
  try {
    const host = sessionStorage.getItem(HOST_KEY);
    return host ? wrapperPage(host, lang) : window.location.host;
  } catch {
    return window.location.host;
  }
}
