import { describe, expect, it } from 'vitest';
import { buildCsp, parseEmbedParents } from '@/lib/csp.mjs';

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

describe('buildCsp', () => {
  const ancestors = (csp: string) => csp.split('; ').find((d) => d.startsWith('frame-ancestors'));

  it('production allows only oec.world by default', () => {
    expect(ancestors(buildCsp({ dev: false }))).toBe("frame-ancestors 'self' https://oec.world https://*.oec.world");
  });

  it('adds EMBED_PARENTS and nothing else', () => {
    expect(ancestors(buildCsp({ dev: false, embedParents: 'http://localhost:3000, https://*.evil.com' }))).toBe(
      "frame-ancestors 'self' https://oec.world https://*.oec.world http://localhost:3000",
    );
  });
});
