import { describe, expect, it } from 'vitest';
import { buildCsp, parseEmbedParents } from '@/lib/csp.mjs';
import { embedSearch, parseConsent, parseTheme } from '@/lib/embed';

describe('parseEmbedParents', () => {
  it('is empty by default', () => {
    expect(parseEmbedParents(undefined)).toEqual([]);
    expect(parseEmbedParents('')).toEqual([]);
  });

  it('normalizes http(s) origins and dedupes', () => {
    expect(parseEmbedParents(' http://localhost:3000/ , http://localhost:3000, https://staging.oec.world/x ')).toEqual([
      'http://localhost:3000',
      'https://staging.oec.world',
    ]);
  });

  it('drops anything that is not a plain http(s) origin', () => {
    expect(parseEmbedParents("javascript:alert(1), *, https://*.evil.com, ftp://x.com, a; script-src *")).toEqual([]);
  });
});

describe('embed query params', () => {
  it('treats only the string true as consent', () => {
    expect(parseConsent('true')).toBe(true);
    expect(parseConsent('TRUE')).toBe(true);
    expect(parseConsent('True')).toBe(true);
    expect(parseConsent('false')).toBe(false);
    expect(parseConsent('1')).toBe(false);
    expect(parseConsent('yes')).toBe(false);
    expect(parseConsent(null)).toBe(false);
    expect(parseConsent(undefined)).toBe(false);
    expect(parseConsent('')).toBe(false);
  });

  it('accepts light and dark, and defaults anything else to light', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('DARK')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('blue')).toBe('light');
    expect(parseTheme(null)).toBe('light');
  });

  it('keeps theme and consent on in-app links', () => {
    expect(embedSearch('es', 'dark', true)).toBe('lang=es&theme=dark&consent=true');
    expect(embedSearch('en', 'light', false)).toBe('lang=en&theme=light&consent=false');
  });
});

describe('buildCsp', () => {
  const ancestors = (csp: string) => csp.split('; ').find((d) => d.startsWith('frame-ancestors'));

  it('production allows only oec.world by default', () => {
    expect(ancestors(buildCsp({ dev: false }))).toBe("frame-ancestors 'self' https://oec.world https://*.oec.world");
  });

  it('allows AdSense hosts only when ads are enabled', () => {
    expect(buildCsp({ dev: false })).not.toContain('googlesyndication');
    expect(buildCsp({ dev: false, ads: true })).toContain('https://pagead2.googlesyndication.com');
  });

  it('adds EMBED_PARENTS and nothing else', () => {
    expect(ancestors(buildCsp({ dev: false, embedParents: 'http://localhost:3000, https://*.evil.com' }))).toBe(
      "frame-ancestors 'self' https://oec.world https://*.oec.world http://localhost:3000",
    );
  });
});
