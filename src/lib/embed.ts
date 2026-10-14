/**
 * Query params the OEC parent passes when it embeds the game.
 * Direct visits omit them: that is not a saved session and not an ad session.
 */

export type Theme = 'light' | 'dark';

/** Long-lived identity. Cleared on any page opened without consent=true. */
export const PLAYER_COOKIE = 'emy_player';
/** Permission to persist, set only when the page URL has consent=true. Not an identifier. */
export const CONSENT_COOKIE = 'emy_consent';

/** True only for the literal value "true" (any case). Missing, "false", "1" and "yes" are not consent. */
export function parseConsent(value: string | null | undefined): boolean {
  return value?.toLowerCase() === 'true';
}

/** `dark` or `light`. Anything else stays on the default light paper theme. */
export function parseTheme(value: string | null | undefined): Theme {
  return value?.toLowerCase() === 'dark' ? 'dark' : 'light';
}

/**
 * Query string for in-app links. Always includes theme and consent so a click
 * cannot drop `consent=true` and turn a saved session into a guest one.
 */
export function embedSearch(lang: string, theme: Theme, consent: boolean): string {
  const q = new URLSearchParams();
  q.set('lang', lang);
  q.set('theme', theme);
  q.set('consent', consent ? 'true' : 'false');
  return q.toString();
}
