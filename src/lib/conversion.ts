import { computeCO2, solveEquivalent } from './emissions';
import { PINNED_COUNTRIES } from './data';
import { toSigFigs } from './format';
import { countryNames } from './country-names';
import type { CountryFactors, Item, Localized } from './types';

export interface ConversionRow {
  iso3: string;
  name: Localized;
  flag: string;
  qtyB: number;
  gramsA: number;
  isPlayer: boolean;
}

/**
 * The same comparison recomputed across the player's country plus the pinned
 * eight (spec §9.3), sorted by answer value.
 */
export function buildConversionRows(
  itemA: Item,
  qtyA: number,
  itemB: Item,
  playerCf: CountryFactors,
  allCf: CountryFactors[],
): ConversionRow[] {
  const isoSet = new Set([playerCf.iso3, ...PINNED_COUNTRIES]);
  const rows: ConversionRow[] = [];
  for (const iso3 of isoSet) {
    const cf = allCf.find((c) => c.iso3 === iso3);
    if (!cf) continue;
    rows.push({
      iso3,
      name: countryNames(iso3),
      flag: cf.flag,
      qtyB: toSigFigs(solveEquivalent(itemA, qtyA, itemB, cf).qtyB),
      gramsA: computeCO2(itemA, qtyA, cf).grams,
      isPlayer: iso3 === playerCf.iso3,
    });
  }
  rows.sort((a, b) => a.qtyB - b.qtyB);
  return rows;
}

export interface Takeaway {
  /** 'a_cleaner': the clue activity itself varies by country; 'b_more': the clue is country-invariant but the equivalent varies */
  kind: 'a_cleaner' | 'b_more';
  clean: Localized;
  dirty: Localized;
  ratio: number;
}

/** One-line generated takeaway from the conversion table (spec §9.3). */
export function takeaway(rows: ConversionRow[]): Takeaway | null {
  if (rows.length < 2) return null;
  const byGramsA = [...rows].sort((a, b) => a.gramsA - b.gramsA);
  const gramsRatio = byGramsA[byGramsA.length - 1].gramsA / byGramsA[0].gramsA;
  if (gramsRatio >= 1.5) {
    // e.g. "In Norway this hairdryer session is 20× cleaner than in India."
    return {
      kind: 'a_cleaner',
      clean: byGramsA[0].name,
      dirty: byGramsA[byGramsA.length - 1].name,
      ratio: toSigFigs(gramsRatio),
    };
  }
  // clue is country-invariant (fuel): more of B per same CO2 where B is cleaner
  const qtyRatio = rows[rows.length - 1].qtyB / rows[0].qtyB;
  if (qtyRatio >= 1.5) {
    return {
      kind: 'b_more',
      clean: rows[rows.length - 1].name,
      dirty: rows[0].name,
      ratio: toSigFigs(qtyRatio),
    };
  }
  return null;
}
