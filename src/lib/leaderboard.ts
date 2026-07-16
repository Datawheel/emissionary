import { q } from './db';
import { getCountry } from './data';
import type { PlayerRow } from './player';

export interface LeaderboardRow {
  rank: number;
  name: string;
  flag: string;
  country: string;
  score: number;
  is_you: boolean;
}

export interface LeaderboardPage {
  scope: 'daily' | 'weekly' | 'alltime';
  rows: LeaderboardRow[];
  you: LeaderboardRow | null;
  total_players: number;
  offset: number;
}

const PAGE = 50;

function displayName(name: string, disc: number | null): string {
  return disc ? `${name}#${String(disc).padStart(4, '0')}` : name;
}

/**
 * Leaderboards are queries over guesses — no mutable score tables (spec §15.2).
 * Anonymous players (name IS NULL) are excluded from public rows but always
 * see their own rank (spec §10).
 */
export async function leaderboard(
  scope: 'daily' | 'weekly' | 'alltime',
  player: PlayerRow | null,
  opts: { country?: string; offset?: number; date?: string } = {},
): Promise<LeaderboardPage> {
  const offset = Math.max(0, opts.offset ?? 0);
  let totalsSql: string;
  const params: unknown[] = [];

  if (scope === 'daily') {
    params.push(opts.date);
    totalsSql = `
      SELECT g.player_id, sum(g.score)::int AS score, sum(g.ms_elapsed)::bigint AS tiebreak
        FROM guesses g JOIN rounds r ON r.id = g.round_id
       WHERE r.set_date = $1
       GROUP BY g.player_id
      HAVING count(*) = 5`;
  } else if (scope === 'weekly') {
    totalsSql = `
      SELECT player_id, round(avg(score))::int AS score, count(*)::bigint AS tiebreak
        FROM (
          SELECT g.player_id, g.score,
                 row_number() OVER (PARTITION BY g.player_id ORDER BY g.score DESC) AS rn
            FROM guesses g JOIN rounds r ON r.id = g.round_id
           WHERE r.set_date IS NULL
             AND date_trunc('week', g.created_at) = date_trunc('week', now())
        ) best
       WHERE rn <= 20
       GROUP BY player_id
      HAVING count(*) >= 10`;
  } else {
    totalsSql = `
      SELECT g.player_id, sum(g.score)::int AS score, 0::bigint AS tiebreak
        FROM guesses g JOIN rounds r ON r.id = g.round_id
       WHERE r.set_date IS NOT NULL
       GROUP BY g.player_id`;
  }

  const countryFilter = opts.country ? `AND p.country = $${params.length + 1}` : '';
  if (opts.country) params.push(opts.country);

  const ranked = `
    WITH totals AS (${totalsSql}),
    named AS (
      SELECT t.player_id, t.score, t.tiebreak, p.name, p.name_discriminator, p.country,
             rank() OVER (ORDER BY t.score DESC, t.tiebreak ${scope === 'weekly' ? 'DESC' : 'ASC'}) AS rank
        FROM totals t JOIN players p ON p.id = t.player_id
       WHERE p.name IS NOT NULL ${countryFilter}
    )`;

  const rows = await q<{
    player_id: string; score: number; name: string; name_discriminator: number | null;
    country: string; rank: string;
  }>(
    `${ranked} SELECT * FROM named ORDER BY rank OFFSET $${params.length + 1} LIMIT ${PAGE}`,
    [...params, offset],
  );
  const count = await q<{ n: string }>(`${ranked} SELECT count(*)::text AS n FROM named`, params);

  const toRow = (r: (typeof rows)[number], isYou: boolean): LeaderboardRow => ({
    rank: Number(r.rank),
    name: displayName(r.name, r.name_discriminator),
    flag: safeFlag(r.country),
    country: r.country,
    score: r.score,
    is_you: isYou,
  });

  let you: LeaderboardRow | null = null;
  if (player) {
    const inPage = rows.find((r) => r.player_id === player.id);
    if (inPage) {
      you = toRow(inPage, true);
    } else {
      // anonymous players (or off-page) still see their own standing
      const own = await q<{ score: number; rank: string }>(
        `WITH totals AS (${totalsSql}),
         all_ranked AS (
           SELECT t.player_id, t.score,
                  rank() OVER (ORDER BY t.score DESC, t.tiebreak ${scope === 'weekly' ? 'DESC' : 'ASC'}) AS rank
             FROM totals t
         )
         SELECT score, rank::text FROM all_ranked WHERE player_id = $${params.length + 1}`,
        [...params, player.id],
      );
      if (own[0]) {
        you = {
          rank: Number(own[0].rank),
          name: player.name ? displayName(player.name, player.name_discriminator) : 'Anonymous 🦊',
          flag: safeFlag(player.country),
          country: player.country,
          score: own[0].score,
          is_you: true,
        };
      }
    }
  }

  return {
    scope,
    rows: rows.map((r) => toRow(r, r.player_id === player?.id)),
    you,
    total_players: Number(count[0]?.n ?? 0),
    offset,
  };
}

function safeFlag(iso3: string): string {
  try {
    return getCountry(iso3).flag;
  } catch {
    return '🏳️';
  }
}
