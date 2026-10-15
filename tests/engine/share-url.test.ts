import { describe, expect, it } from 'vitest';
import { wrapperHost, wrapperPage } from '@/lib/share-url';

describe('wrapperHost', () => {
  it('accepts OEC origins', () => {
    expect(wrapperHost('https://dev.oec.world/en/games/emissionary', false)).toBe('dev.oec.world');
    expect(wrapperHost('https://oec.world/', false)).toBe('oec.world');
  });
  it('rejects foreign or insecure origins', () => {
    expect(wrapperHost('https://oec.world.evil.com/x', false)).toBeNull();
    expect(wrapperHost('https://evil.example/oec.world', false)).toBeNull();
    expect(wrapperHost('http://oec.world/x', false)).toBeNull();
    expect(wrapperHost('', false)).toBeNull();
    expect(wrapperHost(null, false)).toBeNull();
  });
  it('allows localhost only in dev', () => {
    expect(wrapperHost('http://localhost:3000/es/games/emissionary', true)).toBe('localhost:3000');
    expect(wrapperHost('http://localhost:3000/es/games/emissionary', false)).toBeNull();
  });
});

describe('wrapperPage', () => {
  it('uses the wrapper locales (en/es) and falls back to en', () => {
    expect(wrapperPage('dev.oec.world', 'es')).toBe('dev.oec.world/es/games/emissionary');
    expect(wrapperPage('dev.oec.world', 'fr')).toBe('dev.oec.world/en/games/emissionary');
  });
});
