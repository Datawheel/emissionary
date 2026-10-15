import { describe, expect, it } from 'vitest';
import { parseShareUrl } from '@/lib/share-url';

describe('parseShareUrl', () => {
  it('accepts OEC pages and drops scheme and trailing slash', () => {
    expect(parseShareUrl('https://dev.oec.world/en/games/emissionary/', false)).toBe('dev.oec.world/en/games/emissionary');
    expect(parseShareUrl('https://oec.world/es/games/emissionary', false)).toBe('oec.world/es/games/emissionary');
  });
  it('rejects foreign or insecure origins', () => {
    expect(parseShareUrl('https://evil.example/oec.world', false)).toBeNull();
    expect(parseShareUrl('https://oec.world.evil.com/x', false)).toBeNull();
    expect(parseShareUrl('http://oec.world/x', false)).toBeNull();
    expect(parseShareUrl('not a url', false)).toBeNull();
    expect(parseShareUrl(null, false)).toBeNull();
  });
  it('allows localhost only in dev', () => {
    expect(parseShareUrl('http://localhost:3001/en/games/emissionary', true)).toBe('localhost:3001/en/games/emissionary');
    expect(parseShareUrl('http://localhost:3001/en/games/emissionary', false)).toBeNull();
  });
});
