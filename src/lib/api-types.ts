import type { Breakdown } from './emissions';
import type { ConversionRow, Takeaway } from './conversion';
import type { Localized, LocalizedPlural, Unit } from './types';

/** What the client sees BEFORE guessing — no truths, no factors (spec §12). */
export interface ClientRound {
  round_id: string;
  round_type: 'binary' | 'quant';
  item_a: ClientItem;
  qty_a: number;
  item_b: ClientItem;
  qty_b?: number; // binary only
  slider_min?: number;
  slider_max?: number;
  round_no?: number;
}

export interface ClientItem {
  id: string;
  name: Localized;
  emoji: string;
  category: string;
  typical_unit: Unit;
  event_noun?: LocalizedPlural;
}

export interface FreeplayTotals {
  rounds_played: number;
  avg_score: number | null;
  current_streak: number;
  best_streak: number;
}

/** Per-single-unit basics ("1 min of hairdryer = 0.03 kWh · 1.2 g CO₂") — the
 *  memorable numbers that build intuition, computed in the guess country. */
export interface UnitFact {
  emoji: string;
  name: Localized;
  typical_unit: Unit;
  event_noun?: LocalizedPlural;
  kwh: number | null;
  grams: number;
}

/** Assumption note + citations — reveal-only (notes contain physical values). */
export interface RevealItemInfo {
  assumption_note: Localized;
  value_year: number;
  sources: { publisher: string; year: number; url: string }[];
}

/** Returned only in response to a guess submission (spec §12). */
export interface GuessResponse {
  item_info_a: RevealItemInfo;
  item_info_b: RevealItemInfo;
  truth: number;
  guess?: number;
  choice?: 'a' | 'b';
  correct?: boolean; // binary
  score: number;
  grams_target: number;
  grams_a?: number; // binary reveal
  grams_b?: number;
  breakdown_a: Breakdown;
  breakdown_b: Breakdown;
  conversion_rows: ConversionRow[];
  takeaway: Takeaway | null;
  unit_facts: UnitFact[];
  slider_min?: number;
  slider_max?: number;
  totals: FreeplayTotals;
  already_answered: boolean;
}
