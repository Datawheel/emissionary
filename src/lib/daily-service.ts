import { randomUUID } from 'node:crypto';
import { q, tx } from './db';
import { getCountry, loadCountryFactors, loadItems } from './data';
import { solveEquivalent } from './emissions';
import { generateDailySet, seededRng, type RoundSpec } from './rounds';
import type { ClientRound } from './api-types';
import { toClientRound, type RoundRow } from './round-service';
import type { PlayerRow } from './player';

const DAILY_LOCK_KEY = 428_001;
const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

function dailySalt(): string {
  return process.env.DAILY_SALT ?? 'change_me_daily_salt';
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function secondsToNextUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.floor((next - now.getTime()) / 1000);
}

/** Day number for the share card: UTC days since LAUNCH_DATE (spec §11). */
export function dayNumber(date: string): number {
  const launch = process.env.LAUNCH_DATE ?? '2026-09-01';
  return Math.round((Date.parse(date) - Date.parse(launch)) / 86_400_000) + 1;
}

/**
 * Slider bounds for a shared daily round must hold for EVERY country's truth:
 * span from the global min truth to the global max truth, then stretch ≥10×
 * beyond each (with the round's deterministic rng), so no player's truth sits
 * near an edge and bounds leak nothing about any single country.
 */
function dailyBounds(spec: RoundSpec, rng: () => number): { min: number; max: number } {
  const items = loadItems();
  const itemA = items.find((i) => i.id === spec.item_a)!;
  const itemB = items.find((i) => i.id === spec.item_b)!;
  let lo = Infinity;
  let hi = 0;
  for (const cf of loadCountryFactors()) {
    const t = solveEquivalent(itemA, spec.qty_a, itemB, cf).qtyB;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  // asymmetric stretch so the truth envelope is off-center (anti "guess the middle")
  const offset = (0.3 + rng() * 0.5) * (rng() < 0.5 ? -1 : 1);
  const halfWidth = 1 + Math.abs(offset) + rng() * 0.3;
  return { min: lo * 10 ** (offset - halfWidth), max: hi * 10 ** (offset + halfWidth) };
}

/** Get or deterministically create the daily set (spec §8.1). */
export async function getDailyRounds(date: string): Promise<RoundRow[]> {
  const existing = await q<RoundRow>(
    'SELECT * FROM rounds WHERE set_date = $1 ORDER BY set_index',
    [date],
  );
  if (existing.length === 5) return existing;

  return tx(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [DAILY_LOCK_KEY]);
    const again = await client.query<RoundRow>(
      'SELECT * FROM rounds WHERE set_date = $1 ORDER BY set_index',
      [date],
    );
    if (again.rows.length === 5) return again.rows;

    const items = loadItems();
    const referenceCf = getCountry('FRA');
    const salt = dailySalt();
    const specs = generateDailySet(items, referenceCf, date, salt);
    await client.query('INSERT INTO daily_sets (date, rounds, seed) VALUES ($1, $2, $3)', [
      date,
      JSON.stringify(specs),
      `${salt.slice(0, 4)}…:${date}`,
    ]);
    const rows: RoundRow[] = [];
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const rng = seededRng(`${salt}:bounds:${date}:${i}`);
      const bounds = spec.round_type === 'quant' ? dailyBounds(spec, rng) : null;
      const res = await client.query<RoundRow>(
        `INSERT INTO rounds (id, set_date, set_index, item_a, qty_a, item_b, qty_b, round_type, difficulty, slider_min, slider_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [randomUUID(), date, i, spec.item_a, spec.qty_a, spec.item_b, spec.qty_b ?? null,
         spec.round_type, spec.difficulty, bounds?.min ?? null, bounds?.max ?? null],
      );
      rows.push(res.rows[0]);
    }
    return rows;
  });
}

export interface DailyProgress {
  date: string;
  day_number: number;
  rounds: ClientRound[];
  /** per set_index: the player's score, or null if unanswered */
  scores: (number | null)[];
  next_index: number | null; // null when complete
  total: number;
  completed: boolean;
  locked_country: string | null;
  percentile: number | null;
  seconds_to_next: number;
}

export async function getDailyProgress(player: PlayerRow, date: string): Promise<DailyProgress> {
  const rounds = await getDailyRounds(date);
  const guesses = await q<{ round_id: string; score: number; country: string; created_at: Date }>(
    `SELECT round_id, score, country, created_at FROM guesses
      WHERE player_id = $1 AND round_id = ANY($2)`,
    [player.id, rounds.map((r) => r.id)],
  );
  const byRound = new Map(guesses.map((g) => [g.round_id, g]));
  const scores = rounds.map((r) => byRound.get(r.id)?.score ?? null);
  const nextIndex = scores.findIndex((s) => s == null);
  const completed = nextIndex === -1;
  const total = scores.reduce<number>((a, s) => a + (s ?? 0), 0);
  const lockedCountry = guesses.length
    ? guesses.sort((a, b) => a.created_at.getTime() - b.created_at.getTime())[0].country
    : null;

  let percentile: number | null = null;
  if (completed) {
    const rows = await q<{ better: string; total: string }>(
      `WITH totals AS (
         SELECT g.player_id, sum(g.score) AS score
           FROM guesses g JOIN rounds r ON r.id = g.round_id
          WHERE r.set_date = $1
          GROUP BY g.player_id
         HAVING count(*) = 5
       )
       SELECT count(*) FILTER (WHERE score < $2)::text AS better, count(*)::text AS total FROM totals`,
      [date, total],
    );
    const better = Number(rows[0].better);
    const totalPlayers = Number(rows[0].total);
    percentile = totalPlayers > 1 ? Math.round((100 * better) / (totalPlayers - 1)) : 100;
  }

  return {
    date,
    day_number: dayNumber(date),
    rounds: rounds.map((r, i) => toClientRound(r, i + 1)),
    scores,
    next_index: completed ? null : nextIndex,
    total,
    completed,
    locked_country: lockedCountry,
    percentile,
    seconds_to_next: secondsToNextUtcMidnight(),
  };
}

/** Country lock + session window checks for daily guesses (spec §5, §12). */
export async function dailyGuessContext(
  player: PlayerRow,
  round: RoundRow,
): Promise<{ country: string }> {
  const rounds = await q<{ id: string }>('SELECT id FROM rounds WHERE set_date = $1', [round.set_date]);
  const prior = await q<{ country: string; created_at: Date }>(
    `SELECT country, created_at FROM guesses
      WHERE player_id = $1 AND round_id = ANY($2)
      ORDER BY created_at ASC`,
    [player.id, rounds.map((r) => r.id)],
  );
  if (prior.length) {
    const first = prior[0];
    if (Date.now() - first.created_at.getTime() > SESSION_WINDOW_MS) {
      throw new SessionExpiredError();
    }
    return { country: first.country };
  }
  return { country: player.country };
}

export class SessionExpiredError extends Error {
  constructor() {
    super('daily session window expired');
  }
}
