import { q } from './db';
import { getCountry } from './data';
import type { PlayerRow } from './player';

export interface LeaderboardRow {
  rank: number;
  name: string;
  flag: string;
  country: string;
  score: number;
  /** distinct Daily Game dates played (null on the today board) */
  days: number | null;
  is_you: boolean;
}

export interface LeaderboardPage {
  scope: 'daily' | 'alltime' | 'days';
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
 * ONLY Daily Game rounds count: Free Play is practice and never earns board
 * points (volume must not be a strategy). Anonymous players (name IS NULL)
 * are excluded from public rows but always see their own rank (spec §10).
 *
 * Scopes: 'daily' = today's completed sets; 'alltime' = cumulative daily
 * points; 'days' = loyalty, ranked by distinct days played.
 */
export async function leaderboard(
  scope: 'daily' | 'alltime' | 'days',
  player: PlayerRow | null,
  opts: { country?: string; offset?: number; date?: string } = {},
): Promise<LeaderboardPage> {
  const offset = Math.max(0, opts.offset ?? 0);
  const params: unknown[] = [];
  let totalsSql: string;
  let order: string;

  if (scope === 'daily') {
    params.push(opts.date);
    totalsSql = `
      SELECT g.player_id, sum(g.score)::int AS score, NULL::int AS days,
             sum(g.ms_elapsed)::bigint AS tiebreak
        FROM guesses g JOIN rounds r ON r.id = g.round_id
       WHERE r.set_date = $1
       GROUP BY g.player_id
      HAVING count(*) = 5`;
    order = 'score DESC, tiebreak ASC';
  } else {
    totalsSql = `
      SELECT g.player_id, sum(g.score)::int AS score,
             count(DISTINCT r.set_date)::int AS days, 0::bigint AS tiebreak
        FROM guesses g JOIN rounds r ON r.id = g.round_id
       WHERE r.set_date IS NOT NULL
       GROUP BY g.player_id`;
    order = scope === 'days' ? 'days DESC, score DESC' : 'score DESC, days DESC';
  }

  const countryFilter = opts.country ? `AND p.country = $${params.length + 1}` : '';
  if (opts.country) params.push(opts.country);

  const ranked = `
    WITH totals AS (${totalsSql}),
    named AS (
      SELECT t.player_id, t.score, t.days, t.tiebreak, p.name, p.name_discriminator, p.country,
             rank() OVER (ORDER BY ${order}) AS rank
        FROM totals t JOIN players p ON p.id = t.player_id
       WHERE p.name IS NOT NULL ${countryFilter}
    )`;

  const rows = await q<{
    player_id: string; score: number; days: number | null; name: string;
    name_discriminator: number | null; country: string; rank: string;
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
    days: r.days,
    is_you: isYou,
  });

  let you: LeaderboardRow | null = null;
  if (player) {
    const inPage = rows.find((r) => r.player_id === player.id);
    if (inPage) {
      you = toRow(inPage, true);
    } else {
      const own = await q<{ score: number; days: number | null; rank: string }>(
        `WITH totals AS (${totalsSql}),
         all_ranked AS (
           SELECT t.player_id, t.score, t.days,
                  rank() OVER (ORDER BY ${order}) AS rank
             FROM totals t
         )
         SELECT score, days, rank::text FROM all_ranked WHERE player_id = $${params.length + 1}`,
        [...params, player.id],
      );
      if (own[0]) {
        you = {
          rank: Number(own[0].rank),
          name: player.name ? displayName(player.name, player.name_discriminator) : 'Anonymous 🦊',
          flag: safeFlag(player.country),
          country: player.country,
          score: own[0].score,
          days: own[0].days,
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
