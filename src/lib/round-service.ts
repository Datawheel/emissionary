import { randomUUID } from 'node:crypto';
import { q } from './db';
import { getCountry, loadItems } from './data';
import { computeCO2, solveEquivalent } from './emissions';
import { buildConversionRows, takeaway } from './conversion';
import { loadCountryFactors } from './data';
import { pairKey, seededRng, selectBinaryRound, selectQuantRound, sliderBounds, type RoundSpec } from './rounds';
import { score as scoreFn, scoreBinary, signedLogError } from './scoring';
import { loadSources } from './data';
import { toSigFigs } from './format';
import type { ClientItem, ClientRound, FreeplayTotals, GuessResponse, RevealItemInfo, UnitFact } from './api-types';
import type { CountryFactors, Item } from './types';
import type { PlayerRow } from './player';

export interface RoundRow {
  id: string;
  set_date: string | null;
  set_index: number | null;
  player_id: string | null;
  item_a: string;
  qty_a: string;
  item_b: string;
  qty_b: string | null;
  round_type: 'binary' | 'quant';
  difficulty: number;
  slider_min: string | null;
  slider_max: string | null;
  /** free play only: which survival run the round belongs to */
  run_no: number | null;
}

function toClientItem(item: Item): ClientItem {
  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji,
    category: item.category,
    typical_unit: item.typical_unit,
    event_noun: item.event_noun,
  };
}

export function toClientRound(row: RoundRow, roundNo?: number): ClientRound {
  const items = loadItems();
  const itemA = items.find((i) => i.id === row.item_a)!;
  const itemB = items.find((i) => i.id === row.item_b)!;
  return {
    round_id: row.id,
    round_type: row.round_type,
    item_a: toClientItem(itemA),
    qty_a: Number(row.qty_a),
    item_b: toClientItem(itemB),
    qty_b: row.qty_b != null ? Number(row.qty_b) : undefined,
    slider_min: row.slider_min != null ? Number(row.slider_min) : undefined,
    slider_max: row.slider_max != null ? Number(row.slider_max) : undefined,
    round_no: roundNo,
  };
}

/** Recent pair history + recent accuracy for adaptive difficulty (spec §8.2). */
async function playerRecent(playerId: string): Promise<{ pairs: Set<string>; avg: number | null; count: number }> {
  const rows = await q<{ item_a: string; item_b: string; score: number | null }>(
    `SELECT r.item_a, r.item_b, g.score
       FROM rounds r LEFT JOIN guesses g ON g.round_id = r.id AND g.player_id = r.player_id
      WHERE r.player_id = $1
      ORDER BY r.created_at DESC
      LIMIT 30`,
    [playerId],
  );
  const pairs = new Set(rows.map((r) => pairKey(r.item_a, r.item_b)));
  const scored = rows.filter((r) => r.score != null).slice(0, 10);
  const avg = scored.length ? scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length : null;
  return { pairs, avg, count: rows.length };
}

/** Free Play is a survival run: this many 0-point rounds and it is over. */
export const MAX_STRIKES = 3;

interface RunStats {
  rounds: number;
  score: number;
  strikes: number;
}

async function runStats(playerId: string, runNo: number): Promise<RunStats> {
  const rows = await q<RunStats>(
    `SELECT count(g.id)::int AS rounds,
            coalesce(sum(g.score), 0)::int AS score,
            (count(g.id) FILTER (WHERE g.score = 0))::int AS strikes
       FROM rounds r JOIN guesses g ON g.round_id = r.id AND g.player_id = r.player_id
      WHERE r.player_id = $1 AND r.set_date IS NULL AND r.run_no = $2`,
    [playerId, runNo],
  );
  return rows[0];
}

async function latestRunNo(playerId: string): Promise<number | null> {
  const rows = await q<{ run_no: number | null }>(
    'SELECT max(run_no) AS run_no FROM rounds WHERE player_id = $1 AND set_date IS NULL',
    [playerId],
  );
  return rows[0]?.run_no ?? null;
}

/** The run the next free-play round belongs to: the latest one, unless it has struck out. */
async function activeRunNo(playerId: string): Promise<number> {
  const latest = await latestRunNo(playerId);
  if (latest == null) return 1;
  return (await runStats(playerId, latest)).strikes >= MAX_STRIKES ? latest + 1 : latest;
}

export async function createFreeplayRound(player: PlayerRow): Promise<ClientRound> {
  const runNo = await activeRunNo(player.id);
  // an unanswered round comes back (reloading must not deal a fresh round and dodge a strike)
  const pending = await q<RoundRow>(
    `SELECT r.* FROM rounds r
       LEFT JOIN guesses g ON g.round_id = r.id AND g.player_id = r.player_id
      WHERE r.player_id = $1 AND r.set_date IS NULL AND r.run_no = $2 AND g.id IS NULL
      ORDER BY r.created_at DESC
      LIMIT 1`,
    [player.id, runNo],
  );
  if (pending[0]) return toClientRound(pending[0]);

  const items = loadItems();
  const cf = getCountry(player.country);
  const { pairs, avg, count } = await playerRecent(player.id);
  const rng = seededRng(`freeplay:${player.id}:${count}:${randomUUID()}`);

  const difficulty = avg == null ? 2 : avg < 60 ? 2 : avg > 85 ? 3 : 3;
  const isBinary = (count + 1) % 2 === 0; // every other round — players favor pairs

  let spec: RoundSpec;
  try {
    spec = isBinary
      ? selectBinaryRound(items, cf, rng, { excludePairs: pairs })
      : selectQuantRound(items, cf, rng, { difficulty, excludePairs: pairs });
  } catch {
    // pool exhausted for constraints — relax the history restriction
    spec = isBinary
      ? selectBinaryRound(items, cf, rng, {})
      : selectQuantRound(items, cf, rng, { difficulty });
  }

  const id = randomUUID();
  let sliderMin: number | null = null;
  let sliderMax: number | null = null;
  if (spec.round_type === 'quant') {
    const itemA = items.find((i) => i.id === spec.item_a)!;
    const itemB = items.find((i) => i.id === spec.item_b)!;
    const truth = solveEquivalent(itemA, spec.qty_a, itemB, cf).qtyB;
    const bounds = sliderBounds(truth, rng);
    sliderMin = bounds.min;
    sliderMax = bounds.max;
  }

  const rows = await q<RoundRow>(
    `INSERT INTO rounds (id, player_id, item_a, qty_a, item_b, qty_b, round_type, difficulty, slider_min, slider_max, run_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, player.id, spec.item_a, spec.qty_a, spec.item_b, spec.qty_b ?? null, spec.round_type, spec.difficulty, sliderMin, sliderMax, runNo],
  );
  return toClientRound(rows[0]);
}

export async function freeplayTotals(playerId: string): Promise<FreeplayTotals> {
  const rows = await q<{ score: number }>(
    `SELECT g.score
       FROM guesses g JOIN rounds r ON r.id = g.round_id
      WHERE g.player_id = $1 AND r.set_date IS NULL
      ORDER BY g.created_at DESC
      LIMIT 1000`,
    [playerId],
  );
  const scores = rows.map((r) => r.score);
  let current = 0;
  for (const s of scores) {
    if (s >= 80) current++;
    else break;
  }
  let best = 0;
  let run = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    run = scores[i] >= 80 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return {
    rounds_played: scores.length,
    avg_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    current_streak: current,
    best_streak: best,
    ...(await runSummary(playerId)),
  };
}

/** The latest run (just ended, or in progress) and the player's longest run. */
async function runSummary(playerId: string): Promise<Pick<FreeplayTotals, 'run' | 'best_run_rounds'>> {
  const latest = await latestRunNo(playerId);
  const stats = latest == null ? { rounds: 0, score: 0, strikes: 0 } : await runStats(playerId, latest);
  const best = await q<{ best: number | null }>(
    `SELECT max(n)::int AS best FROM (
       SELECT count(g.id) AS n
         FROM rounds r JOIN guesses g ON g.round_id = r.id AND g.player_id = r.player_id
        WHERE r.player_id = $1 AND r.set_date IS NULL AND r.run_no IS NOT NULL
        GROUP BY r.run_no) runs`,
    [playerId],
  );
  return {
    run: { ...stats, max_strikes: MAX_STRIKES, over: stats.strikes >= MAX_STRIKES },
    best_run_rounds: best[0]?.best ?? 0,
  };
}

function revealItemInfo(item: Item): RevealItemInfo {
  const registry = loadSources();
  return {
    assumption_note: item.assumption_note,
    value_year: item.value_year,
    sources: item.source_ids
      .map((id) => registry.find((s) => s.source_id === id))
      .filter((s): s is NonNullable<typeof s> => s != null)
      .map((s) => ({ publisher: s.publisher, year: s.year, url: s.url })),
  };
}

function unitFact(item: Item, cf: CountryFactors): UnitFact {
  const one = computeCO2(item, 1, cf);
  return {
    emoji: item.emoji,
    name: item.name,
    typical_unit: item.typical_unit,
    event_noun: item.event_noun,
    kwh: one.energy_kwh != null ? toSigFigs(one.energy_kwh) : null,
    grams: one.grams,
  };
}

export class GuessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function submitGuess(
  player: PlayerRow,
  roundId: string,
  input: { value?: number; choice?: 'a' | 'b'; ms_elapsed?: number },
): Promise<GuessResponse> {
  const roundRows = await q<RoundRow>('SELECT * FROM rounds WHERE id = $1', [roundId]);
  const round = roundRows[0];
  if (!round) throw new GuessError(404, 'round not found');
  if (round.player_id && round.player_id !== player.id) throw new GuessError(403, 'not your round');

  const items = loadItems();
  const itemA = items.find((i) => i.id === round.item_a)!;
  const itemB = items.find((i) => i.id === round.item_b)!;
  // daily rounds: country locks at the first guess and a 2 h session window applies (spec §5, §12)
  let guessCountry = player.country;
  if (round.set_date != null) {
    const { dailyGuessContext, SessionExpiredError } = await import('./daily-service');
    try {
      guessCountry = (await dailyGuessContext(player, round)).country;
    } catch (err) {
      if (err instanceof SessionExpiredError) throw new GuessError(403, 'daily session expired');
      throw err;
    }
  }
  // a run that has struck out takes no more answers (e.g. a second tab)
  if (round.set_date == null && round.run_no != null) {
    const answered = await q('SELECT 1 FROM guesses WHERE player_id = $1 AND round_id = $2', [player.id, roundId]);
    if (!answered.length && (await runStats(player.id, round.run_no)).strikes >= MAX_STRIKES) {
      throw new GuessError(409, 'run over');
    }
  }
  const cf = getCountry(guessCountry);
  const factors = loadCountryFactors();
  const qtyA = Number(round.qty_a);
  const ms = Math.max(0, Math.min(input.ms_elapsed ?? 0, 7_200_000));

  let truth: number;
  let scoreValue: number;
  let sle: number | null = null;
  let guessValue: number | null = null;
  let choiceValue: 'a' | 'b' | null = null;

  if (round.round_type === 'quant') {
    if (typeof input.value !== 'number' || !(input.value > 0)) throw new GuessError(400, 'value required');
    const min = Number(round.slider_min);
    const max = Number(round.slider_max);
    if (input.value < min / 10 || input.value > max * 10) throw new GuessError(400, 'guess out of bounds');
    truth = solveEquivalent(itemA, qtyA, itemB, cf).qtyB;
    guessValue = input.value;
    scoreValue = scoreFn(guessValue, truth);
    sle = signedLogError(guessValue, truth);
  } else {
    if (input.choice !== 'a' && input.choice !== 'b') throw new GuessError(400, 'choice required');
    const gramsA = computeCO2(itemA, qtyA, cf).grams;
    const gramsB = computeCO2(itemB, Number(round.qty_b), cf).grams;
    truth = gramsA > gramsB ? 1 : 0; // 1 ⇔ 'a'
    choiceValue = input.choice;
    scoreValue = scoreBinary((input.choice === 'a') === gramsA > gramsB);
  }

  await q(
    `INSERT INTO guesses (id, player_id, round_id, country, guess, choice, truth, signed_log_error, score, ms_elapsed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (player_id, round_id) DO NOTHING`,
    [randomUUID(), player.id, roundId, guessCountry, guessValue, choiceValue, truth, sle, scoreValue, ms],
  );

  // idempotency: the stored guess wins on replays (spec §12)
  const stored = (
    await q<{ guess: string | null; choice: 'a' | 'b' | null; truth: string; score: number; created_at: Date }>(
      'SELECT guess, choice, truth, score, created_at FROM guesses WHERE player_id = $1 AND round_id = $2',
      [player.id, roundId],
    )
  )[0];
  const alreadyAnswered =
    round.round_type === 'quant'
      ? Number(stored.guess) !== guessValue
      : stored.choice !== choiceValue;

  const solved = solveEquivalent(itemA, qtyA, itemB, cf);
  const rows = buildConversionRows(itemA, qtyA, itemB, cf, factors);
  const totals = await freeplayTotals(player.id);

  const base: GuessResponse = {
    item_info_a: revealItemInfo(itemA),
    item_info_b: revealItemInfo(itemB),
    truth: Number(stored.truth),
    score: stored.score,
    grams_target: solved.gramsTarget,
    breakdown_a: solved.breakdownA,
    breakdown_b: round.round_type === 'quant' ? solved.breakdownB : computeCO2(itemB, Number(round.qty_b), cf),
    conversion_rows: rows,
    takeaway: takeaway(rows),
    unit_facts: [unitFact(itemA, cf), unitFact(itemB, cf)],
    totals,
    already_answered: alreadyAnswered,
  };
  if (round.round_type === 'quant') {
    base.guess = Number(stored.guess);
    base.slider_min = Number(round.slider_min);
    base.slider_max = Number(round.slider_max);
  } else {
    base.choice = stored.choice ?? undefined;
    const gramsA = computeCO2(itemA, qtyA, cf).grams;
    const gramsB = computeCO2(itemB, Number(round.qty_b), cf).grams;
    base.grams_a = gramsA;
    base.grams_b = gramsB;
    base.correct = stored.score > 0;
  }
  return base;
}
