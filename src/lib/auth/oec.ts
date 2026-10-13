/**
 * OEC identity handoff. When Emissionary is embedded in oec.world, the parent
 * mints a short-lived HS256 JWT ({ sub, name, email }) signed with a secret
 * shared via GAMES_TOKEN_SECRET and sends it over postMessage. `sub` is the
 * ONLY trusted identity: the {id, name, email} that travel next to the token
 * are display-only and must never be used for account binding.
 */
import { errors as joseErrors, jwtVerify } from 'jose';

const AUDIENCE = 'emissionary';
const ISSUER = 'oec.world';

export interface OecTokenClaims {
  sub: string;
  name?: string;
}

export class OecTokenConfigError extends Error {}
export class OecTokenExpiredError extends Error {}
export class OecTokenInvalidError extends Error {}

export async function verifyGamesToken(token: string): Promise<OecTokenClaims> {
  const secret = process.env.GAMES_TOKEN_SECRET?.trim();
  if (!secret) {
    // Fail closed: never trust an OEC identity we cannot verify.
    throw new OecTokenConfigError('GAMES_TOKEN_SECRET is not configured');
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'], // pin the alg: rejects "none" and asymmetric-key confusion
      audience: AUDIENCE, // rejects tokens minted for another OEC game
      issuer: ISSUER,
    });
    if (!payload.sub) throw new OecTokenInvalidError('token missing sub claim');
    // The email in the token is deliberately dropped: we never need or store it.
    return { sub: payload.sub, name: typeof payload.name === 'string' ? payload.name : undefined };
  } catch (e) {
    if (e instanceof joseErrors.JWTExpired) throw new OecTokenExpiredError('OEC token expired');
    if (e instanceof OecTokenInvalidError) throw e;
    throw new OecTokenInvalidError('OEC token verification failed');
  }
}

/**
 * Turn an OEC display name into a candidate leaderboard name: strip the
 * characters validateName rejects and cap it at 20 code points. Whether the
 * result is acceptable (length, blocklist) is still validateName's call.
 */
export function leaderboardNameFrom(raw: string | undefined): string {
  return [...(raw ?? '').replace(/[\n\r\t<>@#]/g, '').trim().normalize('NFC')].slice(0, 20).join('').trim();
}
