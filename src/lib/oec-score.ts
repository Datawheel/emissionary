/**
 * Finished-game report for the OEC games log, the same endpoint Tradle and
 * Connectrade POST (https://oec.world/api/games/score). Emissionary sends it
 * from the server, once, when a Daily is completed or a Free Play run strikes
 * out: the score is the one just stored, and userId is the verified OEC sub.
 * A missing URL, a network error, or a non-2xx response never fails the guess.
 */
import { q } from './db';
import { dayNumber } from './daily-service';
import { MAX_STRIKES } from './round-service';

const DEFAULT_URL = 'https://oec.world/api/games/score';

export interface OecScorePayload {
  game: 'emissionary';
  meta: { mode: 'daily' | 'freeplay'; userId?: string };
  answer: Record<string, unknown>;
  submission: Record<string, unknown>;
  won: boolean;
}

/** Explicit OEC_SCORE_URL, or the OEC endpoint in production. `off` disables it. */
export function oecScoreUrl(): string | null {
  const raw = process.env.OEC_SCORE_URL?.trim();
  if (raw === 'off' || raw === '') return null;
  if (raw) return raw;
  return process.env.NODE_ENV === 'production' ? DEFAULT_URL : null;
}

/** In-flight reports, so tests can wait without the guess request itself waiting. */
let pending: Promise<void> = Promise.resolve();

export function noteReport(work: Promise<void>): void {
  const guarded = work.catch((err) => console.error('OEC score post failed', err));
  pending = pending.then(() => guarded, () => guarded);
}

export function finishedReports(): Promise<void> {
  return pending;
}

export async function postOecScore(payload: OecScorePayload): Promise<void> {
  const url = oecScoreUrl();
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) console.error('OEC score post failed', res.status);
  } catch (err) {
    console.error('OEC score post failed', err);
  }
}

async function oecUserId(playerId: string): Promise<string | undefined> {
  const rows = await q<{ oec_user_id: string | null }>('SELECT oec_user_id FROM players WHERE id = $1', [playerId]);
  return rows[0]?.oec_user_id ?? undefined;
}

/**
 * Called after a guess row is newly inserted. Posts only when that guess is
 * the one that finishes the game, so a replay or a reload does not send again.
 */
export async function reportFinishedGame(playerId: string, roundId: string): Promise<void> {
  if (!oecScoreUrl()) return;
  const [round] = await q<{ set_date: string | null; run_no: number | null }>(
    `SELECT to_char(set_date, 'YYYY-MM-DD') AS set_date, run_no FROM rounds WHERE id = $1`,
    [roundId],
  );
  if (!round) return;
  const userId = await oecUserId(playerId);
  if (round.set_date) await reportDaily(playerId, round.set_date, userId);
  else if (round.run_no != null) await reportFreeplay(playerId, round.run_no, userId);
}

/** Daily is finished when all five rounds have a guess. Completing it is the result. */
async function reportDaily(playerId: string, date: string, userId: string | undefined): Promise<void> {
  const rows = await q<{ set_index: number; score: number; country: string }>(
    `SELECT r.set_index, g.score, g.country
       FROM rounds r
       JOIN guesses g ON g.round_id = r.id AND g.player_id = $1
      WHERE r.set_date = $2::date
      ORDER BY r.set_index`,
    [playerId, date],
  );
  if (rows.length < 5) return;
  const scores = rows.map((r) => r.score);
  const total = scores.reduce((a, b) => a + b, 0);
  await postOecScore({
    game: 'emissionary',
    meta: { mode: 'daily', ...(userId ? { userId } : {}) },
    answer: { date, day_number: dayNumber(date), country: rows[0].country },
    submission: { scores, total },
    won: true,
  });
}

/** Free Play ends on the third 0-point round. The result is how far the run got. */
async function reportFreeplay(playerId: string, runNo: number, userId: string | undefined): Promise<void> {
  const rows = await q<{ score: number; country: string }>(
    `SELECT g.score, g.country
       FROM rounds r
       JOIN guesses g ON g.round_id = r.id AND g.player_id = r.player_id
      WHERE r.player_id = $1 AND r.set_date IS NULL AND r.run_no = $2
      ORDER BY g.created_at`,
    [playerId, runNo],
  );
  const scores = rows.map((r) => r.score);
  const strikes = scores.filter((s) => s === 0).length;
  if (strikes < MAX_STRIKES) return;
  const score = scores.reduce((a, b) => a + b, 0);
  await postOecScore({
    game: 'emissionary',
    meta: { mode: 'freeplay', ...(userId ? { userId } : {}) },
    answer: { country: rows[rows.length - 1]?.country, run_no: runNo },
    submission: { rounds: scores.length, score, strikes, scores },
    won: false,
  });
}
