/**
 * The address to print in the share text. Embedded in the OEC hub, the wrapper
 * passes its own page as ?share=; it is only trusted when it points at an OEC
 * origin, so the param cannot put an arbitrary link in a player's share text.
 * Returns host + path without the scheme, e.g. "dev.oec.world/en/games/emissionary".
 */
export function parseShareUrl(raw: string | null | undefined, dev: boolean): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const oec = u.protocol === 'https:' && (u.hostname === 'oec.world' || u.hostname.endsWith('.oec.world'));
    const local = dev && u.protocol === 'http:' && u.hostname === 'localhost';
    if (!oec && !local) return null;
    return `${u.host}${u.pathname}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

const SHARE_KEY = 'emy:share-url';

/** Client only. Call on app load: ?share= exists just on the entry URL, in-game links drop it. */
export function captureShareUrl(): void {
  try {
    const raw = new URLSearchParams(window.location.search).get('share');
    const addr = parseShareUrl(raw, process.env.NODE_ENV !== 'production');
    if (addr) sessionStorage.setItem(SHARE_KEY, addr);
  } catch {
    /* storage blocked: the share text falls back to this host */
  }
}

/** Client only. The wrapper's page address kept by captureShareUrl, else this host. */
export function shareAddress(): string {
  try {
    return sessionStorage.getItem(SHARE_KEY) ?? window.location.host;
  } catch {
    return window.location.host;
  }
}
