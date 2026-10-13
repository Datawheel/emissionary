/** Binds an Emissionary player to a verified OEC identity (the `sub` claim). */
import { q } from '../db';
import { claimName, NameError } from '../names';
import { createPlayer, type PlayerRow } from '../player';
import { leaderboardNameFrom, type OecTokenClaims } from './oec';
import { mergePlayers } from './provider';

export type LinkResult =
  /** No player exists yet (country not chosen) and none is linked: retry once one is created. */
  | { status: 'pending' }
  /**
   * `changed` = the browser's player id differs from before (the cookie must move).
   * `seeded` = the OEC name was just applied. Either way server-rendered pages are stale.
   */
  | { status: 'linked'; playerId: string; changed: boolean; seeded: boolean; name: string | null };

async function oecPlayerId(sub: string): Promise<string | null> {
  const rows = await q<{ id: string }>('SELECT id FROM players WHERE oec_user_id = $1', [sub]);
  return rows[0]?.id ?? null;
}

async function oecIdOf(playerId: string): Promise<string | null> {
  const rows = await q<{ oec_user_id: string | null }>('SELECT oec_user_id FROM players WHERE id = $1', [playerId]);
  return rows[0]?.oec_user_id ?? null;
}

/**
 * - OEC account already has a player → that player wins; an anonymous player
 *   in this browser is merged into it (earlier guess wins on collisions).
 * - Otherwise the browser's anonymous player becomes the account's player.
 * - A browser player already bound to a different OEC account is left alone
 *   (its history is not merged into someone else's) and a fresh player is made.
 * - No player at all → pending.
 * The caller sets the cookie to `playerId` when `changed`.
 */
export async function linkOecPlayer(current: PlayerRow | null, claims: OecTokenClaims): Promise<LinkResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const existingId = await oecPlayerId(claims.sub);
    let playerId: string;
    let changed: boolean;

    if (existingId) {
      playerId = existingId;
      changed = current?.id !== existingId;
      if (current && current.id !== existingId && (await oecIdOf(current.id)) === null) {
        await mergePlayers(current.id, existingId);
      }
    } else if (current) {
      const bound = await oecIdOf(current.id);
      if (bound === null) {
        try {
          await q('UPDATE players SET oec_user_id = $1 WHERE id = $2 AND oec_user_id IS NULL', [claims.sub, current.id]);
        } catch (err) {
          if ((err as { code?: string }).code === '23505') continue; // lost a race to link the same account: re-read
          throw err;
        }
        playerId = current.id;
        changed = false;
      } else {
        // same browser, different OEC account: start a new player on the same country
        const fresh = await createPlayer(current.country);
        await q('UPDATE players SET oec_user_id = $1 WHERE id = $2', [claims.sub, fresh.id]);
        playerId = fresh.id;
        changed = true;
      }
    } else {
      return { status: 'pending' };
    }

    const named = await seedName(playerId, claims.name);
    return { status: 'linked', playerId, changed, seeded: named.seeded, name: named.name };
  }
  return { status: 'pending' };
}

/**
 * Default the leaderboard name to the OEC one — only while the player has no
 * name yet, and only when it passes validation. Otherwise the player gets the
 * usual name prompt on the leaderboard.
 */
async function seedName(
  playerId: string,
  oecName: string | undefined,
): Promise<{ name: string | null; seeded: boolean }> {
  const rows = await q<{ name: string | null; name_discriminator: number | null }>(
    'SELECT name, name_discriminator FROM players WHERE id = $1',
    [playerId],
  );
  const row = rows[0];
  if (!row) return { name: null, seeded: false };
  if (row.name) return { name: shown(row.name, row.name_discriminator), seeded: false };
  const candidate = leaderboardNameFrom(oecName);
  if (!candidate) return { name: null, seeded: false };
  try {
    const claimed = await claimName(playerId, candidate);
    return { name: shown(claimed.name, claimed.discriminator), seeded: true };
  } catch (err) {
    if (err instanceof NameError) return { name: null, seeded: false };
    throw err;
  }
}

const shown = (name: string, discriminator: number | null) =>
  discriminator ? `${name}#${String(discriminator).padStart(4, '0')}` : name;
