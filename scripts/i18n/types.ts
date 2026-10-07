import type { PluralForms } from '../../src/lib/types';

/** One language's text for every item: display name, assumption note, and (for per-event items) the counted noun. */
export type ItemText = Record<string, { name: string; note: string; event?: PluralForms }>;

/**
 * French typography for notes written with ordinary spaces: no-break space
 * before : ; ? ! and between a number and %, °C or a unit; narrow no-break
 * space as the thousands separator ("1 500" → "1 500").
 */
export function frTypo(s: string): string {
  return s
    .replace(/(\d) (\d{3})(?!\d)/g, '$1 $2')
    .replace(/ ([:;?!%])/g, ' $1')
    .replace(/(\d) (°C|kWh|Wh|kW|W|g|kg|km|L|mL|h|mi)(?![\p{L}])/gu, '$1 $2');
}
