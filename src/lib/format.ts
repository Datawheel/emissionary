import type { Lang, Unit } from './types';

/** Round to 2 significant figures (spec §3.5). */
export function toSigFigs(value: number, figs = 2): number {
  if (value === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (figs - 1 - mag);
  return Math.round(value * factor) / factor;
}

const TIME_UNITS: { limit: number; div: number; en: string; es: string }[] = [
  { limit: 90, div: 1, en: 's', es: 's' },
  { limit: 90 * 60, div: 60, en: 'min', es: 'min' },
  { limit: 48 * 3600, div: 3600, en: 'h', es: 'h' },
  { limit: 60 * 86400, div: 86400, en: 'days', es: 'días' },
  { limit: Infinity, div: 30.44 * 86400, en: 'months', es: 'meses' },
];

function formatNumber(value: number, lang: Lang): string {
  const v = toSigFigs(value);
  return v.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 6 });
}

/** Format a quantity in an item's natural unit, choosing a readable time scale. */
export function formatQty(value: number, unit: Unit, lang: Lang): string {
  if (unit === 'minutes' || unit === 'hours') {
    const seconds = unit === 'minutes' ? value * 60 : value * 3600;
    const u = TIME_UNITS.find((t) => seconds < t.limit) ?? TIME_UNITS[TIME_UNITS.length - 1];
    let scaled = seconds / u.div;
    if (u.en === 'days' && scaled >= 1.5 && lang === 'en' ? false : false) scaled = scaled; // no-op; singular handled below
    const label = u[lang];
    const n = formatNumber(scaled, lang);
    if (u.en === 'days' && n === '1') return lang === 'es' ? '1 día' : '1 day';
    if (u.en === 'months' && n === '1') return lang === 'es' ? '1 mes' : '1 month';
    return `${n} ${label}`;
  }
  if (unit === 'km') return `${formatNumber(value, lang)} km`;
  if (unit === 'liters_boiled') {
    const n = formatNumber(value, lang);
    return lang === 'es' ? `${n} L` : `${n} L`;
  }
  // events: bare number; the caller appends the item's event noun
  return `${formatNumber(value, lang)}×`;
}

/**
 * Prose-friendly product name: parenthetical qualifiers stripped, lowercased —
 * but acronyms (LED, PC, TV) and measurements keep their case.
 */
export function proseName(name: string): string {
  // parentheticals are dropped in prose, except the per-passenger basis of
  // shared vehicles — losing it would misstate what the number measures
  return name
    .replace(/\s*\((?!per passenger|por pasajero)[^)]*\)/g, '')
    .split(' ')
    .map((w) => (w.length >= 2 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(' ');
}

/** Grams below 1000 g, kilograms above; 2 sig figs (spec §3.5). */
export function formatCO2(grams: number, lang: Lang): string {
  const co2 = 'CO₂';
  if (grams < 1000) return `${formatNumber(grams, lang)} g ${co2}`;
  return `${formatNumber(grams / 1000, lang)} kg ${co2}`;
}
