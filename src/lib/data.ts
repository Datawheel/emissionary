import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { LANGS, type CountryFactors, type Item, type Source } from './types';

/** Every supported language is required — a missing translation fails loading. */
const localized = z.object(Object.fromEntries(LANGS.map((l) => [l, z.string().min(1)])) as Record<(typeof LANGS)[number], z.ZodString>);
const pluralForms = z.object({
  one: z.string().min(1).optional(),
  few: z.string().min(1).optional(),
  many: z.string().min(1).optional(),
  other: z.string().min(1),
});
const localizedPlural = z.object(Object.fromEntries(LANGS.map((l) => [l, pluralForms])) as Record<(typeof LANGS)[number], typeof pluralForms>);

export const itemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_]+$/),
    name: localized,
    emoji: z.string().min(1),
    category: z.string().min(1),
    energy_model: z.enum(['power', 'per_event', 'task', 'per_km']),
    power_watts: z.number().positive().optional(),
    kwh_per_event: z.number().positive().optional(),
    event_noun: localizedPlural.optional(),
    task_kwh_useful: z.number().positive().optional(),
    efficiency: z.number().gt(0).lte(1).optional(),
    carrier: z.enum(['electricity', 'natural_gas', 'lpg', 'petrol', 'diesel']),
    kwh_per_km: z.number().positive().optional(),
    uses_country_car_default: z.boolean().optional(),
    l_per_100km: z.number().positive().optional(),
    gco2_per_km: z.number().positive().optional(),
    per_passenger: z.boolean().optional(),
    typical_unit: z.enum(['minutes', 'hours', 'events', 'km', 'liters_boiled']),
    clue_quantities: z.array(z.number().positive()).min(2).optional(),
    assumption_note: localized,
    source_ids: z.array(z.string().min(1)).min(1),
    value_year: z.number().int().gte(2000),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .superRefine((item, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    switch (item.energy_model) {
      case 'power':
        if (item.power_watts == null) fail(`${item.id}: power model requires power_watts`);
        break;
      case 'per_event':
        if (item.kwh_per_event == null || item.event_noun == null)
          fail(`${item.id}: per_event model requires kwh_per_event and event_noun`);
        break;
      case 'task':
        if (item.task_kwh_useful == null || item.efficiency == null)
          fail(`${item.id}: task model requires task_kwh_useful and efficiency`);
        break;
      case 'per_km': {
        const modes = [
          item.kwh_per_km != null,
          item.uses_country_car_default === true,
          item.l_per_100km != null,
          item.gco2_per_km != null,
        ].filter(Boolean).length;
        if (modes !== 1)
          fail(`${item.id}: per_km model requires exactly one of kwh_per_km, uses_country_car_default, l_per_100km, gco2_per_km`);
        if (item.kwh_per_km != null && item.carrier !== 'electricity')
          fail(`${item.id}: kwh_per_km requires carrier=electricity`);
        if (item.l_per_100km != null && item.carrier !== 'petrol' && item.carrier !== 'diesel')
          fail(`${item.id}: l_per_100km requires carrier petrol or diesel`);
        break;
      }
    }
  });

export const countryFactorsSchema = z.object({
  iso3: z.string().length(3),
  name: z.string().min(1),
  flag: z.string().min(1),
  grid_gco2_kwh: z.number().positive(),
  grid_year: z.number().int().gte(2015),
  grid_source_id: z.string().min(1),
  car_gco2_km: z.number().positive(),
  car_year: z.number().int().gte(2015),
  car_source_id: z.string().min(1),
  car_is_fallback: z.boolean(),
});

export const sourceSchema = z.object({
  source_id: z.string().regex(/^[a-z0-9_]+$/),
  publisher: z.string().min(1),
  title: z.string().min(1),
  year: z.number().int().gte(1990),
  url: z.string().url(),
  license: z.string().min(1),
  retrieved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const DATA_DIR = process.env.EMISSIONARY_DATA_DIR ?? join(process.cwd(), 'data');

function loadJson<T>(file: string, schema: z.ZodType<T>): T[] {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
  return z.array(schema).parse(raw) as T[];
}

let itemsCache: Item[] | null = null;
let factorsCache: CountryFactors[] | null = null;
let sourcesCache: Source[] | null = null;
export function loadItems(): Item[] {
  return (itemsCache ??= loadJson('items.json', itemSchema) as Item[]);
}

export function loadCountryFactors(): CountryFactors[] {
  return (factorsCache ??= loadJson('country_factors.json', countryFactorsSchema));
}

export function loadSources(): Source[] {
  return (sourcesCache ??= loadJson('sources.json', sourceSchema));
}

export function getCountry(iso3: string): CountryFactors {
  const cf = loadCountryFactors().find((c) => c.iso3 === iso3);
  if (!cf) throw new Error(`unknown country: ${iso3}`);
  return cf;
}

export const PINNED_COUNTRIES = ['FRA', 'DEU', 'POL', 'NOR', 'USA', 'CHN', 'IND', 'BRA'];
