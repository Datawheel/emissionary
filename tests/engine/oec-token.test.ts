import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  leaderboardNameFrom,
  OecTokenConfigError,
  OecTokenExpiredError,
  OecTokenInvalidError,
  verifyGamesToken,
} from '@/lib/auth/oec';

const SECRET = 'test-shared-secret';
const key = (s = SECRET) => new TextEncoder().encode(s);

function mint(over: { aud?: string; iss?: string; exp?: string | number; secret?: string; sub?: string | null } = {}) {
  const jwt = new SignJWT({ name: 'Ada Lovelace', email: 'ada@example.org' })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(over.aud ?? 'emissionary')
    .setIssuer(over.iss ?? 'oec.world')
    .setIssuedAt()
    .setExpirationTime(over.exp ?? '30m');
  if (over.sub !== null) jwt.setSubject(over.sub ?? 'user-42');
  return jwt.sign(key(over.secret));
}

describe('verifyGamesToken', () => {
  const prev = process.env.GAMES_TOKEN_SECRET;
  beforeEach(() => {
    process.env.GAMES_TOKEN_SECRET = SECRET;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.GAMES_TOKEN_SECRET;
    else process.env.GAMES_TOKEN_SECRET = prev;
  });

  it('accepts a valid token and returns sub + name, never the email', async () => {
    const claims = await verifyGamesToken(await mint());
    expect(claims).toEqual({ sub: 'user-42', name: 'Ada Lovelace' });
  });

  it('rejects a token minted for another game', async () => {
    await expect(verifyGamesToken(await mint({ aud: 'world-trade-cup' }))).rejects.toBeInstanceOf(OecTokenInvalidError);
  });

  it('rejects a wrong issuer, a wrong secret and a missing sub', async () => {
    await expect(verifyGamesToken(await mint({ iss: 'evil.example' }))).rejects.toBeInstanceOf(OecTokenInvalidError);
    await expect(verifyGamesToken(await mint({ secret: 'other' }))).rejects.toBeInstanceOf(OecTokenInvalidError);
    await expect(verifyGamesToken(await mint({ sub: null }))).rejects.toBeInstanceOf(OecTokenInvalidError);
  });

  it('flags an expired token so the client can ask for a fresh one', async () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    await expect(verifyGamesToken(await mint({ exp: past }))).rejects.toBeInstanceOf(OecTokenExpiredError);
  });

  it('rejects an unsigned (alg none) token', async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'x', aud: 'emissionary', iss: 'oec.world' })}.`;
    await expect(verifyGamesToken(forged)).rejects.toBeInstanceOf(OecTokenInvalidError);
  });

  it('fails closed when the secret is not configured', async () => {
    const token = await mint();
    delete process.env.GAMES_TOKEN_SECRET;
    await expect(verifyGamesToken(token)).rejects.toBeInstanceOf(OecTokenConfigError);
  });
});

describe('leaderboardNameFrom', () => {
  it('strips characters validateName rejects and caps at 20 code points', () => {
    expect(leaderboardNameFrom('Ada #Lovelace@')).toBe('Ada Lovelace');
    const long = leaderboardNameFrom('A very long display name indeed');
    expect([...long].length).toBeLessThanOrEqual(20);
    expect(long).toBe(long.trim());
  });

  it('returns an empty string when there is nothing usable', () => {
    expect(leaderboardNameFrom(undefined)).toBe('');
    expect(leaderboardNameFrom(' #@ ')).toBe('');
  });
});
