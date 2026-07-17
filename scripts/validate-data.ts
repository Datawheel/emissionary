/**
 * Data validation suite (spec §4.4) — run via `npm run validate` (and as
 * pretest). Exits non-zero with a per-violation report.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCountry, loadCountryFactors, loadItems, loadSources, PINNED_COUNTRIES } from '../src/lib/data';
import { generateSourcesMd } from './generate-sources-md';
import { computeCO2 } from '../src/lib/emissions';
import type { CountryFactors, Item } from '../src/lib/types';

const CURRENT_YEAR = new Date().getFullYear();

export function validateData(): string[] {
  const errors: string[] = [];
  const items = loadItems();
  const factors = loadCountryFactors();
  const sources = loadSources();
  const sourceIds = new Set(sources.map((s) => s.source_id));

  // 1) provenance: every source reference resolves
  for (const item of items) {
    for (const sid of item.source_ids) {
      if (!sourceIds.has(sid)) errors.push(`${item.id}: unknown source_id ${sid}`);
    }
  }
  for (const cf of factors) {
    if (!sourceIds.has(cf.grid_source_id)) errors.push(`${cf.iso3}: unknown grid_source_id ${cf.grid_source_id}`);
    if (!sourceIds.has(cf.car_source_id)) errors.push(`${cf.iso3}: unknown car_source_id ${cf.car_source_id}`);
  }
  for (const s of sources) {
    if (!s.url.startsWith('http')) errors.push(`source ${s.source_id}: bad url`);
  }

  // 2) sanity band per item × country: implied gCO2 per hour of typical use
  //    within [0.05 g, 100 kg] — catches W/kW and Wh/kWh unit errors
  const hourly = (item: Item, cf: CountryFactors): number => {
    switch (item.energy_model) {
      case 'power':
        return computeCO2(item, item.typical_unit === 'minutes' ? 60 : 1, cf).grams;
      case 'per_event':
        return computeCO2(item, 1, cf).grams;
      case 'task':
        return computeCO2(item, 1, cf).grams;
      case 'per_km':
        return computeCO2(item, 10, cf).grams; // 10 km as an "hour-ish" of use
    }
  };
  const extremes = [getCountry('NOR'), getCountry('IND')];
  for (const item of items) {
    for (const cf of extremes) {
      const g = hourly(item, cf);
      if (!(g >= 0.005 && g <= 100_000)) {
        errors.push(`${item.id} in ${cf.iso3}: implied ${g.toFixed(3)} g/typical-use outside sanity band`);
      }
    }
  }

  // 3) cross-checks (spec §4.4)
  const boilers = ['electric_kettle', 'induction_hob', 'electric_hob', 'gas_hob'].map(
    (id) => items.find((i) => i.id === id)!,
  );
  if (boilers.every(Boolean)) {
    const [kettle, induction, coil, gas] = boilers;
    const consumed = (i: Item) => (i.task_kwh_useful! * 1) / i.efficiency!;
    if (!(consumed(kettle) <= consumed(induction) && consumed(induction) < consumed(coil) && consumed(coil) < consumed(gas))) {
      errors.push('boiling energy ordering violated: kettle ≤ induction < coil < gas');
    }
    const fra = getCountry('FRA');
    const pol = getCountry('POL');
    const ratioFra = computeCO2(gas, 1, fra).grams / computeCO2(kettle, 1, fra).grams;
    if (!(ratioFra >= 6 && ratioFra <= 12)) errors.push(`France kettle advantage ${ratioFra.toFixed(1)}x outside 6–12x`);
    if (!(computeCO2(gas, 1, pol).grams < computeCO2(kettle, 1, pol).grams)) {
      errors.push('Poland: gas hob should beat kettle');
    }
  } else {
    errors.push('missing flagship boiling items');
  }

  const ev = items.find((i) => i.id === 'ev_car');
  const petrol = items.find((i) => i.id === 'petrol_car');
  if (ev && petrol) {
    for (const cf of factors.filter((c) => c.grid_gco2_kwh < 500)) {
      const evG = computeCO2(ev, 100, cf).grams;
      const petrolG = computeCO2(petrol, 100, cf).grams;
      if (evG >= petrolG) errors.push(`${cf.iso3}: EV (${evG.toFixed(0)}g) should beat petrol (${petrolG.toFixed(0)}g) below 500 gCO2/kWh`);
    }
  } else {
    errors.push('missing ev_car or petrol_car');
  }

  // 4) pinned countries fresh
  for (const iso3 of PINNED_COUNTRIES) {
    const cf = factors.find((c) => c.iso3 === iso3);
    if (!cf) {
      errors.push(`pinned country ${iso3} missing`);
      continue;
    }
    if (cf.grid_year < CURRENT_YEAR - 3) errors.push(`${iso3}: grid_year ${cf.grid_year} stale`);
  }

  // 5) localization completeness
  for (const item of items) {
    if (!item.name.es || !item.assumption_note.es) errors.push(`${item.id}: missing Spanish strings`);
  }

  // 6) SOURCES.md must be regenerated whenever data changes
  try {
    const committed = readFileSync(join(process.cwd(), 'data', 'SOURCES.md'), 'utf8');
    if (committed !== generateSourcesMd()) {
      errors.push('data/SOURCES.md is stale — run: npx tsx scripts/generate-sources-md.ts');
    }
  } catch {
    errors.push('data/SOURCES.md missing — run: npx tsx scripts/generate-sources-md.ts');
  }

  // 7) enough items for round selection (spec M1: ≥40)
  if (items.length < 40) errors.push(`only ${items.length} items; need ≥40`);
  const crossCarrier = items.filter((i) => i.carrier !== 'electricity');
  if (crossCarrier.length < 5) errors.push('need ≥5 non-electric items for cross-carrier rounds');

  return errors;
}

const isMain = process.argv[1]?.endsWith('validate-data.ts');
if (isMain) {
  const errors = validateData();
  if (errors.length) {
    console.error(`✗ ${errors.length} data validation error(s):`);
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log('✓ data validation passed');
}
