import type { CountryFactors, Item } from './types';
import { computeCO2, solveEquivalent } from './emissions';
import { toSigFigs } from './format';

export interface RoundSpec {
  round_type: 'binary' | 'quant';
  item_a: string;
  qty_a: number;
  item_b: string;
  /** binary rounds only: the fixed quantity of item B */
  qty_b?: number;
  difficulty: number;
}

/** cyrb128 string hash — deterministic, dependency-free, isomorphic. */
function cyrb128(str: string): number {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}

/** Deterministic PRNG (mulberry32) seeded from a hash of the seed string. */
export function seededRng(seed: string): () => number {
  let a = cyrb128(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round outward to 2 significant figures (keeps labels clean without moving the center). */
function snapDown(v: number): number {
  const mag = 10 ** (Math.floor(Math.log10(v)) - 1);
  return Math.floor(v / mag) * mag;
}
function snapUp(v: number): number {
  const mag = 10 ** (Math.floor(Math.log10(v)) - 1);
  return Math.ceil(v / mag) * mag;
}

/**
 * Log slider bounds: at least 10× from truth on each side, AND the truth is
 * guaranteed to sit 0.3–0.8 decades away from the slider's center (random
 * side) — otherwise "always guess the middle" would be a winning strategy.
 */
export function sliderBounds(truth: number, rng: () => number = Math.random): { min: number; max: number } {
  const offset = (0.3 + rng() * 0.5) * (rng() < 0.5 ? -1 : 1); // decades, center relative to truth
  const halfWidth = 1 + Math.abs(offset) + rng() * 0.3; // ≥10× beyond truth on the near side
  return {
    min: snapDown(truth * 10 ** (offset - halfWidth)),
    max: snapUp(truth * 10 ** (offset + halfWidth)),
  };
}

/** Natural clue quantities per unit — values a person recognizes. */
const CLUE_QUANTITIES: Record<string, number[]> = {
  minutes: [5, 10, 15, 30, 45, 60],
  hours: [1, 2, 3, 5, 8, 24],
  events: [1, 2, 3, 5, 10],
  km: [5, 10, 20, 50, 100],
  liters_boiled: [1, 2, 5],
};

/** Human-scale window for a truth expressed in item B's natural unit (spec §6.3). */
const HUMAN_SCALE: Record<string, [number, number]> = {
  minutes: [0.5, 43200], // 30 s to 1 month
  hours: [0.01, 720],
  events: [0.2, 2000],
  km: [0.1, 40000],
  liters_boiled: [0.2, 10000],
};

export function pickClueQty(item: Item, rng: () => number): number {
  const options = item.clue_quantities ?? CLUE_QUANTITIES[item.typical_unit];
  return options[Math.floor(rng() * options.length)];
}

function humanScale(item: Item, qty: number): boolean {
  const [lo, hi] = HUMAN_SCALE[item.typical_unit];
  return qty >= lo && qty <= hi;
}

function isCrossCarrier(a: Item, b: Item): boolean {
  return (a.carrier === 'electricity') !== (b.carrier === 'electricity');
}

export interface SelectOpts {
  difficulty: number;
  excludeItemIds?: string[];
  excludePairs?: Set<string>;
  requireCrossCarrier?: boolean;
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/** Select a quantitative round satisfying spec §6.3, or throw after bounded retries. */
export function selectQuantRound(
  items: Item[],
  cf: CountryFactors,
  rng: () => number,
  opts: SelectOpts,
): RoundSpec {
  const excluded = new Set(opts.excludeItemIds ?? []);
  const pool = items.filter((i) => !excluded.has(i.id));
  for (let attempt = 0; attempt < 200; attempt++) {
    let a = pool[Math.floor(rng() * pool.length)];
    let b = pool[Math.floor(rng() * pool.length)];
    if (a.id === b.id) continue;
    // vehicles read better as the anchor ("10 km of car = ? h of AC", never
    // the reverse) — swap so any per-km item is always the clue side
    if (b.energy_model === 'per_km' && a.energy_model !== 'per_km') [a, b] = [b, a];
    if (opts.excludePairs?.has(pairKey(a.id, b.id))) continue;
    if (opts.requireCrossCarrier && !isCrossCarrier(a, b)) continue;
    const pairDifficulty = Math.max(a.difficulty, b.difficulty);
    if (pairDifficulty > opts.difficulty || pairDifficulty < opts.difficulty - 1) continue;
    const qtyA = pickClueQty(a, rng);
    let qtyB: number;
    try {
      qtyB = solveEquivalent(a, qtyA, b, cf).qtyB;
    } catch {
      continue;
    }
    if (!humanScale(b, qtyB)) continue;
    return { round_type: 'quant', item_a: a.id, qty_a: qtyA, item_b: b.id, difficulty: pairDifficulty };
  }
  throw new Error('selectQuantRound: no valid pair found within retry budget');
}

/** Select a binary round: two fixed quantities whose emissions differ by 1.3–8×. */
export function selectBinaryRound(
  items: Item[],
  cf: CountryFactors,
  rng: () => number,
  opts: Omit<SelectOpts, 'difficulty'> & { difficulty?: number },
): RoundSpec {
  const excluded = new Set(opts.excludeItemIds ?? []);
  const pool = items.filter((i) => !excluded.has(i.id) && i.difficulty <= (opts.difficulty ?? 2));
  for (let attempt = 0; attempt < 200; attempt++) {
    const a = pool[Math.floor(rng() * pool.length)];
    const b = pool[Math.floor(rng() * pool.length)];
    if (a.id === b.id) continue;
    if (opts.excludePairs?.has(pairKey(a.id, b.id))) continue;
    if (opts.requireCrossCarrier && !isCrossCarrier(a, b)) continue;
    const qtyA = pickClueQty(a, rng);
    const qtyB = pickClueQty(b, rng);
    let ratio: number;
    try {
      ratio = computeCO2(a, qtyA, cf).grams / computeCO2(b, qtyB, cf).grams;
    } catch {
      continue;
    }
    const r = ratio > 1 ? ratio : 1 / ratio;
    if (r < 1.3 || r > 8) continue;
    return { round_type: 'binary', item_a: a.id, qty_a: qtyA, item_b: b.id, qty_b: qtyB, difficulty: 1 };
  }
  throw new Error('selectBinaryRound: no valid pair found within retry budget');
}

/**
 * Deterministic Daily Game set (spec §8.1): 1 binary warm-up + 4 quantitative,
 * difficulty ramping, at least 2 cross-carrier rounds, no repeated pairs.
 * Truths (and thus human-scale checks) are evaluated against a reference
 * country-independent-ish factor set; pass the caller's canonical CountryFactors
 * (the daily set stores item pairs and quantities only — truths are computed
 * per player country at guess time).
 */
export function generateDailySet(
  items: Item[],
  referenceCf: CountryFactors,
  date: string,
  salt: string,
): RoundSpec[] {
  const rng = seededRng(`${salt}:${date}`);
  const usedPairs = new Set<string>();
  const rounds: RoundSpec[] = [];

  const binary = selectBinaryRound(items, referenceCf, rng, { excludePairs: usedPairs });
  usedPairs.add(pairKey(binary.item_a, binary.item_b));
  rounds.push(binary);

  // rounds 2–5: difficulty ramp; rounds 4 and 5 must be cross-carrier (≥2 of 5)
  const ramp: { difficulty: number; cross: boolean }[] = [
    { difficulty: 1, cross: false },
    { difficulty: 2, cross: false },
    { difficulty: 2, cross: true },
    { difficulty: 3, cross: true },
  ];
  for (const { difficulty, cross } of ramp) {
    const round = selectQuantRound(items, referenceCf, rng, {
      difficulty,
      excludePairs: usedPairs,
      requireCrossCarrier: cross,
    });
    usedPairs.add(pairKey(round.item_a, round.item_b));
    rounds.push(round);
  }
  return rounds;
}

/** Position of the truth within [min,max] in log space, 0..1 — used by the reveal axis. */
export function logPosition(value: number, min: number, max: number): number {
  return (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
}

export function roundToDisplay(qty: number): number {
  return toSigFigs(qty);
}
