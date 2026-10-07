import type { Lang, Localized, LocalizedPlural, Unit } from './types';
import { capFirst, L, LOCALE_TAGS, plural, pluralWord, t } from './i18n';

/** Round to 2 significant figures (spec §3.5). */
export function toSigFigs(value: number, figs = 2): number {
  if (value === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (figs - 1 - mag);
  return Math.round(value * factor) / factor;
}

/** Unit symbols as each language writes them next to a number. */
export const UNIT_SYMBOLS: Record<
  Lang,
  { s: string; min: string; h: string; km: string; L: string; W: string; kWh: string; g: string; kg: string }
> = {
  en: { s: 's', min: 'min', h: 'h', km: 'km', L: 'L', W: 'W', kWh: 'kWh', g: 'g', kg: 'kg' },
  es: { s: 's', min: 'min', h: 'h', km: 'km', L: 'L', W: 'W', kWh: 'kWh', g: 'g', kg: 'kg' },
  fr: { s: 's', min: 'min', h: 'h', km: 'km', L: 'L', W: 'W', kWh: 'kWh', g: 'g', kg: 'kg' },
  de: { s: 's', min: 'Min.', h: 'Std.', km: 'km', L: 'L', W: 'W', kWh: 'kWh', g: 'g', kg: 'kg' },
  ru: { s: 'с', min: 'мин', h: 'ч', km: 'км', L: 'л', W: 'Вт', kWh: 'кВт·ч', g: 'г', kg: 'кг' },
  zh: { s: '秒', min: '分钟', h: '小时', km: '公里', L: '升', W: 'W', kWh: 'kWh', g: 'g', kg: 'kg' },
};

/** A number at 2 significant figures, in the language's own digit grouping and decimal mark. */
export function formatNumber(value: number, lang: Lang, figs = 2): string {
  return toSigFigs(value, figs).toLocaleString(LOCALE_TAGS[lang], { maximumFractionDigits: 6 });
}

/** A number exactly as given (no rounding), localized — for stored constants. */
export function formatExact(value: number, lang: Lang): string {
  return value.toLocaleString(LOCALE_TAGS[lang], { maximumFractionDigits: 6 });
}

type TimeScale = { limit: number; div: number; label: (n: number, lang: Lang) => string };
const TIME_SCALES: TimeScale[] = [
  { limit: 90, div: 1, label: (_n, lang) => UNIT_SYMBOLS[lang].s },
  { limit: 90 * 60, div: 60, label: (_n, lang) => UNIT_SYMBOLS[lang].min },
  { limit: 48 * 3600, div: 3600, label: (_n, lang) => UNIT_SYMBOLS[lang].h },
  { limit: 60 * 86400, div: 86400, label: (n, lang) => pluralWord('days', n, lang) },
  { limit: Infinity, div: 30.44 * 86400, label: (n, lang) => pluralWord('months', n, lang) },
];

/**
 * Format a quantity in an item's natural unit, choosing a readable time scale.
 * Always "<number> <unit>" with a single space (the slider readout splits on it).
 * Events need the item's noun; without one they fall back to "N×".
 */
export function formatQty(value: number, unit: Unit, lang: Lang, eventNoun?: LocalizedPlural): string {
  const sym = UNIT_SYMBOLS[lang];
  if (unit === 'minutes' || unit === 'hours') {
    const seconds = unit === 'minutes' ? value * 60 : value * 3600;
    const scale = TIME_SCALES.find((s) => seconds < s.limit) ?? TIME_SCALES[TIME_SCALES.length - 1];
    const rounded = toSigFigs(seconds / scale.div);
    return `${formatNumber(rounded, lang)} ${scale.label(rounded, lang)}`;
  }
  const rounded = toSigFigs(value);
  if (unit === 'km') return `${formatNumber(rounded, lang)} ${sym.km}`;
  if (unit === 'liters_boiled') return `${formatNumber(rounded, lang)} ${sym.L}`;
  if (eventNoun) return `${formatNumber(rounded, lang)} ${plural(eventNoun[lang], rounded, lang)}`;
  return `${formatNumber(rounded, lang)}×`;
}

/** The fields needed to describe an amount of a product. */
export interface Describable {
  name: Localized;
  typical_unit: Unit;
  event_noun?: LocalizedPlural;
}

export function formatItemQty(qty: number, item: Describable, lang: Lang): string {
  return formatQty(qty, item.typical_unit, lang, item.event_noun);
}

/**
 * Prose-friendly product name: parenthetical qualifiers stripped and the name
 * lowercased for use mid-sentence — except the per-passenger basis of shared
 * vehicles (dropping it would misstate what the number measures), acronyms and
 * mixed-case words (LED, PC, Wi-Fi), and German, where nouns stay capitalized.
 */
export function proseName(name: string, lang: Lang): string {
  const keep = t('per_passenger', lang);
  const stripped = name
    .replace(/\s*[(（][^)）]*[)）]/g, (m) => (m.trim() === keep ? m : ''))
    .trim();
  if (lang === 'de' || lang === 'zh') return stripped;
  return stripped
    .split(' ')
    .map((w) => (/[A-ZА-ЯЁ]/.test(w.slice(1)) ? w : w.toLocaleLowerCase(LOCALE_TAGS[lang])))
    .join(' ');
}

/** "10 min of hairdryer" / "Фен: 10 мин" / "吹风机 10 分钟" — mid-sentence form. */
export function clueLabel(qty: number, item: Describable, lang: Lang): string {
  return clueText(formatItemQty(qty, item, lang), item, lang);
}

function clueText(qty: string, item: Describable, lang: Lang): string {
  return t('clue_pattern', lang, { qty, name: proseName(L(item.name, lang), lang) });
}

/**
 * One unit in the item's own unit, never rescaled — "1 min of hairdryer",
 * "1 h of refrigerator", "1 load of washing machine" (for "Worth remembering").
 */
export function unitClueTitle(item: Describable, lang: Lang): string {
  const sym = UNIT_SYMBOLS[lang];
  const one = formatNumber(1, lang);
  const qty =
    item.typical_unit === 'minutes' ? `${one} ${sym.min}` : item.typical_unit === 'hours' ? `${one} ${sym.h}` : formatItemQty(1, item, lang);
  return capFirst(clueText(qty, item, lang), lang);
}

/** The same phrase as a title (first letter capitalized). */
export function clueTitle(qty: number, item: Describable, lang: Lang): string {
  return capFirst(clueLabel(qty, item, lang), lang);
}

/** Grams below 1000 g, kilograms above; 2 sig figs (spec §3.5). */
export function formatCO2(grams: number, lang: Lang): string {
  const sym = UNIT_SYMBOLS[lang];
  if (grams < 1000) return `${formatNumber(grams, lang)} ${sym.g} CO₂`;
  return `${formatNumber(grams / 1000, lang)} ${sym.kg} CO₂`;
}

export function formatKwh(kwh: number, lang: Lang): string {
  return `${formatNumber(kwh, lang)} ${UNIT_SYMBOLS[lang].kWh}`;
}
