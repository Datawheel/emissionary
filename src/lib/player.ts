import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { q } from './db';

const COOKIE_NAME = 'emy_player';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // 400 days, the browser cap

function secret(): string {
  return process.env.PLAYER_TOKEN_SECRET ?? 'change_me_dev_secret';
}

export function signToken(playerId: string): string {
  const mac = createHmac('sha256', secret()).update(playerId).digest('hex');
  return `${playerId}.${mac}`;
}

export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const playerId = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = createHmac('sha256', secret()).update(playerId).digest('hex');
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return playerId;
}

export interface PlayerRow {
  id: string;
  name: string | null;
  name_discriminator: number | null;
  country: string;
  is_anonymous: boolean;
  renamed_at: Date | null;
}

export async function createPlayer(country: string): Promise<PlayerRow> {
  const id = randomUUID();
  const rows = await q<PlayerRow>(
    `INSERT INTO players (id, country) VALUES ($1, $2)
     RETURNING id, name, name_discriminator, country, is_anonymous, renamed_at`,
    [id, country],
  );
  return rows[0];
}

/** Reads the signed cookie and loads the player; null when absent/invalid. */
export async function currentPlayer(): Promise<PlayerRow | null> {
  const store = await cookies();
  const playerId = verifyToken(store.get(COOKIE_NAME)?.value);
  if (!playerId) return null;
  const rows = await q<PlayerRow>(
    `UPDATE players SET last_seen_at = now() WHERE id = $1
     RETURNING id, name, name_discriminator, country, is_anonymous, renamed_at`,
    [playerId],
  );
  return rows[0] ?? null;
}

export async function setPlayerCookie(playerId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, signToken(playerId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function displayName(p: PlayerRow): string {
  if (!p.name) return 'Anonymous 🦊';
  return p.name_discriminator ? `${p.name}#${String(p.name_discriminator).padStart(4, '0')}` : p.name;
}
