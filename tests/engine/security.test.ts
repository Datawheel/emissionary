import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientIp, limited } from '@/lib/ratelimit';
import { adminKey, passwordMatches, sessionValue, validSession } from '@/lib/admin-auth';

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) });

describe('client IP for rate limiting', () => {
  it('trusts the proxy-written X-Real-IP', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4' }))).toBe('203.0.113.7');
  });

  it('ignores the client-supplied first X-Forwarded-For entry', () => {
    // nginx appends the real address; anything before it came from the client
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('cannot be dodged by rotating a spoofed X-Forwarded-For', () => {
    let blocked = 0;
    for (let i = 0; i < 20; i++) {
      const r = req({ 'x-real-ip': '198.51.100.9', 'x-forwarded-for': `10.0.0.${i}, 198.51.100.9` });
      if (limited(r, 'spoof-test', 5, 60_000)) blocked++;
    }
    expect(blocked).toBe(15);
  });
});

describe('admin access', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is disabled in production without ADMIN_KEY (no default password)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_KEY', '');
    expect(adminKey()).toBeNull();
    expect(passwordMatches('dev-admin')).toBe(false);
    expect(sessionValue()).toBeNull();
    expect(validSession('anything')).toBe(false);
  });

  it('treats the .env.example placeholder as unset in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_KEY', 'change_me_admin_key');
    expect(adminKey()).toBeNull();
    expect(passwordMatches('change_me_admin_key')).toBe(false);
  });

  it('accepts only the configured password and its session cookie', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_KEY', 'correct horse battery');
    expect(passwordMatches('correct horse battery')).toBe(true);
    expect(passwordMatches('correct horse')).toBe(false);
    expect(passwordMatches('dev-admin')).toBe(false);
    expect(validSession(sessionValue()!)).toBe(true);
    expect(validSession('forged')).toBe(false);
    expect(validSession(undefined)).toBe(false);
  });

  it('invalidates sessions when the password changes', () => {
    vi.stubEnv('ADMIN_KEY', 'old');
    const old = sessionValue()!;
    vi.stubEnv('ADMIN_KEY', 'new');
    expect(validSession(old)).toBe(false);
  });
});
