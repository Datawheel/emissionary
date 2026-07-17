import type { Breakdown } from './emissions';
import type { ConversionRow, Takeaway } from './conversion';
import type { Localized, Unit } from './types';

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
  event_noun?: Localized;
}

export interface FreeplayTotals {
  rounds_played: number;
  avg_score: number | null;
  current_streak: number;
  best_streak: number;
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
  equivalence: Localized | null;
  slider_min?: number;
  slider_max?: number;
  totals: FreeplayTotals;
  already_answered: boolean;
}
