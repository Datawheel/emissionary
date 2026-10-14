/**
 * Play without a player row, cookie, or guess log.
 * The round token is an HMAC of what the client already sees (items, quantities,
 * slider bounds, country) — not the answer — so a reload cannot mint a truth
 * and nothing about the visitor is written down.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getCountry, loadItems } from './data';
import { solveEquivalent } from './emissions';
import { dayNumber, secondsToNextUtcMidnight, type DailyProgress } from './daily-service';
import {
  buildGuessResponse,
  evaluateGuess,
  toClientRound,
  MAX_STRIKES,
  type RoundRow,
} from './round-service';
import { seededRng, selectBinaryRound, selectQuantRound, sliderBounds, type RoundSpec } from './rounds';
import type { ClientRound, FreeplayTotals, GuessResponse } from './api-types';

const GUEST_TTL_MS = 2 * 60 * 60 * 1000;

export interface GuestToken {
  v: 1;
  round_id: string;
  round_type: 'binary' | 'quant';
  item_a: string;
  qty_a: number;
  item_b: string;
  qty_b: number | null;
  difficulty: number;
  slider_min: number | null;
  slider_max: number | null;
  country: string;
  exp: number;
}

function secret(): string {
  return process.env.PLAYER_TOKEN_SECRET ?? 'change_me_dev_secret';
}

export function signGuestToken(token: GuestToken): string {
  const body = Buffer.from(JSON.stringify(token)).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verifyGuestToken(raw: string): GuestToken | null {
  const dot = raw.indexOf('.');
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  let parsed: Partial<GuestToken>;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<GuestToken>;
  } catch {
    return null;
  }
  if (parsed.v !== 1) return null;
  if (parsed.round_type !== 'binary' && parsed.round_type !== 'quant') return null;
  if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
  if (typeof parsed.country !== 'string' || !/^[A-Z]{3}$/.test(parsed.country)) return null;
  if (typeof parsed.item_a !== 'string' || typeof parsed.item_b !== 'string') return null;
  if (typeof parsed.qty_a !== 'number' || typeof parsed.round_id !== 'string') return null;
  return parsed as GuestToken;
}

export function totalsFromRun(scores: number[], bestRunRounds: number): FreeplayTotals {
  const strikes = scores.filter((s) => s === 0).length;
  const rounds = scores.length;
  const score = scores.reduce((a, b) => a + b, 0);
  let current = 0;
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= 80) current++;
    else break;
  }
  let bestStreak = 0;
  let streak = 0;
  for (const s of scores) {
    streak = s >= 80 ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    rounds_played: rounds,
    avg_score: rounds ? Math.round(score / rounds) : null,
    current_streak: current,
    best_streak: bestStreak,
    run: { rounds, score, strikes, max_strikes: MAX_STRIKES, over: strikes >= MAX_STRIKES },
    best_run_rounds: Math.max(bestRunRounds, rounds),
  };
}

function tokenFromSpec(
  spec: RoundSpec,
  country: string,
  sliderMin: number | null,
  sliderMax: number | null,
  roundId: string,
): GuestToken {
  return {
    v: 1,
    round_id: roundId,
    round_type: spec.round_type,
    item_a: spec.item_a,
    qty_a: spec.qty_a,
    item_b: spec.item_b,
    qty_b: spec.qty_b ?? null,
    difficulty: spec.difficulty,
    slider_min: sliderMin,
    slider_max: sliderMax,
    country,
    exp: Date.now() + GUEST_TTL_MS,
  };
}

function rowFromToken(token: GuestToken): RoundRow {
  return {
    id: token.round_id,
    set_date: null,
    set_index: null,
    player_id: null,
    item_a: token.item_a,
    qty_a: String(token.qty_a),
    item_b: token.item_b,
    qty_b: token.qty_b == null ? null : String(token.qty_b),
    round_type: token.round_type,
    difficulty: token.difficulty,
    slider_min: token.slider_min == null ? null : String(token.slider_min),
    slider_max: token.slider_max == null ? null : String(token.slider_max),
    run_no: null,
  };
}

/** Next free-play round. History is whatever the browser still holds; nothing is stored. */
export function dealGuestFreeplay(
  country: string,
  pairs: string[],
  scores: number[],
  bestRunRounds: number,
): { round: ClientRound; token: string; totals: FreeplayTotals } {
  const items = loadItems();
  const cf = getCountry(country);
  const count = scores.length;
  const recent = scores.slice(-10);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  const difficulty = avg == null || avg < 60 ? 2 : 3;
  const isBinary = (count + 1) % 2 === 0;
  const exclude = new Set(pairs.filter((p) => p.length <= 80).slice(-40));
  const rng = seededRng(`guest:${country}:${count}:${randomUUID()}`);

  let spec: RoundSpec;
  try {
    spec = isBinary
      ? selectBinaryRound(items, cf, rng, { excludePairs: exclude })
      : selectQuantRound(items, cf, rng, { difficulty, excludePairs: exclude });
  } catch {
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

  const token = tokenFromSpec(spec, country, sliderMin, sliderMax, id);
  return {
    round: toClientRound(rowFromToken(token)),
    token: signGuestToken(token),
    totals: totalsFromRun(scores, bestRunRounds),
  };
}

/** Score a signed round. The answer is recomputed; it is not inside the token. */
export function scoreGuest(
  token: GuestToken,
  input: { value?: number; choice?: 'a' | 'b' },
  priorScores: number[],
  bestRunRounds: number,
): GuessResponse {
  const evaluated = evaluateGuess(rowFromToken(token), token.country, input);
  return buildGuessResponse({
    round: rowFromToken(token),
    country: token.country,
    truth: evaluated.truth,
    score: evaluated.scoreValue,
    guess: evaluated.guessValue,
    choice: evaluated.choiceValue,
    totals: totalsFromRun([...priorScores, evaluated.scoreValue], bestRunRounds),
    alreadyAnswered: false,
  });
}

export function tokenFromRound(round: RoundRow, country: string): string {
  const token: GuestToken = {
    v: 1,
    round_id: round.id,
    round_type: round.round_type,
    item_a: round.item_a,
    qty_a: Number(round.qty_a),
    item_b: round.item_b,
    qty_b: round.qty_b == null ? null : Number(round.qty_b),
    difficulty: round.difficulty,
    slider_min: round.slider_min == null ? null : Number(round.slider_min),
    slider_max: round.slider_max == null ? null : Number(round.slider_max),
    country,
    exp: Date.now() + GUEST_TTL_MS,
  };
  return signGuestToken(token);
}

/** Today's shared puzzle, with no player scores attached. */
export function guestDailyFromRounds(
  rounds: RoundRow[],
  country: string,
  date: string,
): { progress: DailyProgress; tokens: string[] } {
  return {
    tokens: rounds.map((r) => tokenFromRound(r, country)),
    progress: {
      date,
      day_number: dayNumber(date),
      rounds: rounds.map((r, i) => toClientRound(r, i + 1)),
      scores: rounds.map(() => null),
      next_index: 0,
      total: 0,
      completed: false,
      locked_country: country,
      percentile: null,
      seconds_to_next: secondsToNextUtcMidnight(),
    },
  };
}
