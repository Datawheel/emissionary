/**
 * Optional OEC sign-in (spec §15.4) — the ONLY OEC integration point.
 * The protocol details (endpoints, token format, stable user-id claim) are
 * open questions for the OEC team (spec §18); until then NullAuthProvider is
 * wired and the anonymous flow is the sole path. Implementing OecAuthProvider
 * against this interface is the entire remaining work.
 */
import { q, tx } from '../db';

export interface AuthProvider {
  /** Begin the login redirect flow; returns the URL to send the player to. */
  beginLogin(returnTo: string): Promise<string | null>;
  /** Complete the callback; returns the stable external user id + display name. */
  handleCallback(params: URLSearchParams): Promise<{ externalId: string; displayName?: string } | null>;
}

export class NullAuthProvider implements AuthProvider {
  async beginLogin(): Promise<null> {
    return null; // OEC auth unavailable — anonymous-only (graceful degradation, spec §15.4)
  }
  async handleCallback(): Promise<null> {
    return null;
  }
}

export function getAuthProvider(): AuthProvider {
  return new NullAuthProvider();
}

/**
 * Merge an anonymous player into an OEC-linked player (spec §15.4):
 * history carries over; where both answered the same round, the earlier
 * guess wins (the UNIQUE(player_id, round_id) constraint governs).
 */
export async function mergePlayers(anonId: string, linkedId: string): Promise<void> {
  if (anonId === linkedId) return;
  await tx(async (client) => {
    // on collision the EARLIER guess wins: drop the linked player's later guess…
    await client.query(
      `DELETE FROM guesses g2
        WHERE g2.player_id = $2
          AND EXISTS (
            SELECT 1 FROM guesses g
             WHERE g.player_id = $1 AND g.round_id = g2.round_id
               AND g.created_at < g2.created_at
          )`,
      [anonId, linkedId],
    );
    // …move every anon guess that no longer collides…
    await client.query(
      `UPDATE guesses g SET player_id = $2
        WHERE g.player_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM guesses g2 WHERE g2.player_id = $2 AND g2.round_id = g.round_id
          )`,
      [anonId, linkedId],
    );
    // …and discard anon guesses that lost the collision (linked was earlier)
    await client.query('DELETE FROM guesses WHERE player_id = $1', [anonId]);
    await client.query('UPDATE rounds SET player_id = $2 WHERE player_id = $1', [anonId, linkedId]);
    await client.query('DELETE FROM players WHERE id = $1', [anonId]);
  });
}

/** Sanity helper used by tests. */
export async function guessCount(playerId: string): Promise<number> {
  const rows = await q<{ n: string }>('SELECT count(*)::text AS n FROM guesses WHERE player_id = $1', [playerId]);
  return Number(rows[0].n);
}
