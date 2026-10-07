/**
 * The single pure emissions engine (spec §15.3). Every truth, breakdown,
 * and conversion-table figure in the game comes from this module.
 *
 * emissions = energy consumed × emission factor of the energy carrier
 */
import {
  DIESEL_KGCO2_PER_L,
  FUEL_FACTOR_YEAR,
  FUEL_GCO2_PER_KWH_THERMAL,
  PETROL_KGCO2_PER_L,
} from './constants';
import { LANGS, type Carrier, type CountryFactors, type Item, type Lang, type Localized, type Unit } from './types';
import { t, type StringKey, type Vars } from './i18n';
import { formatExact, UNIT_SYMBOLS } from './format';
import { countryName } from './country-names';

/** One line of the "How we computed this" breakdown, in every language. */
export interface BreakdownStep {
  label: Localized;
  math: Localized;
}

export interface Breakdown {
  item_id: string;
  quantity: number;
  unit: Unit;
  /** consumed energy in kWh (thermal for fuels); null for direct-factor per-km items */
  energy_kwh: number | null;
  carrier: Carrier;
  /** the emission factor actually applied, in gCO2/kWh or gCO2/km as noted */
  factor_value: number;
  factor_unit: 'g_per_kwh' | 'g_per_km';
  factor_desc: { country?: string; year: number; source_id: string };
  efficiency?: number;
  grams: number;
  steps: BreakdownStep[];
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** A number as it appears in a breakdown formula: 3 decimals max, localized. */
const n = (v: number, lang: Lang) => formatExact(r3(v), lang);

function perLang(f: (lang: Lang) => string): Localized {
  return Object.fromEntries(LANGS.map((lang) => [lang, f(lang)])) as Localized;
}

function step(key: StringKey, math: (lang: Lang, u: (typeof UNIT_SYMBOLS)[Lang]) => string, vars?: (lang: Lang) => Vars): BreakdownStep {
  return {
    label: perLang((lang) => t(key, lang, vars?.(lang))),
    math: perLang((lang) => math(lang, UNIT_SYMBOLS[lang])),
  };
}

function quantityToHours(quantity: number, unit: Unit): number {
  if (unit === 'minutes') return quantity / 60;
  if (unit === 'hours') return quantity;
  throw new Error(`power model expects a time unit, got ${unit}`);
}

function gridFactor(cf: CountryFactors) {
  return {
    value: cf.grid_gco2_kwh,
    desc: { country: cf.name, year: cf.grid_year, source_id: cf.grid_source_id },
  };
}

export function computeCO2(item: Item, quantity: number, cf: CountryFactors): Breakdown {
  if (!(quantity > 0)) throw new Error(`quantity must be positive, got ${quantity}`);
  const steps: BreakdownStep[] = [];

  // 1) energy consumed (kWh) — or a direct per-km factor path
  let energyKwh: number | null = null;
  let efficiency: number | undefined;

  switch (item.energy_model) {
    case 'power': {
      const hours = quantityToHours(quantity, item.typical_unit);
      energyKwh = (item.power_watts! * hours) / 1000;
      const e = energyKwh;
      steps.push(
        step('step_energy', (l, u) => `${n(item.power_watts!, l)} ${u.W} × ${n(hours, l)} ${l === 'ru' ? 'ч' : 'h'} ÷ 1000 = ${n(e, l)} ${u.kWh}`),
      );
      break;
    }
    case 'per_event': {
      energyKwh = item.kwh_per_event! * quantity;
      const e = energyKwh;
      steps.push(step('step_energy', (l, u) => `${n(item.kwh_per_event!, l)} ${u.kWh} × ${n(quantity, l)} = ${n(e, l)} ${u.kWh}`));
      break;
    }
    case 'task': {
      efficiency = item.efficiency!;
      const useful = item.task_kwh_useful! * quantity;
      energyKwh = useful / efficiency;
      const e = energyKwh;
      const eff = efficiency;
      steps.push(step('step_useful', (l, u) => `${n(item.task_kwh_useful!, l)} ${u.kWh} × ${n(quantity, l)} = ${n(useful, l)} ${u.kWh}`));
      steps.push(
        step(
          'step_efficiency',
          (l, u) => `${n(useful, l)} ${u.kWh} ÷ ${n(eff, l)} = ${n(e, l)} ${u.kWh}`,
          () => ({ pct: Math.round(eff * 100) }),
        ),
      );
      break;
    }
    case 'per_km': {
      if (item.kwh_per_km != null) {
        energyKwh = item.kwh_per_km * quantity;
        const e = energyKwh;
        steps.push(
          step('step_energy', (l, u) => `${n(item.kwh_per_km!, l)} ${u.kWh}/${u.km} × ${n(quantity, l)} ${u.km} = ${n(e, l)} ${u.kWh}`),
        );
      }
      // uses_country_car_default / l_per_100km / gco2_per_km handled below
      break;
    }
  }

  // 2) apply the carrier's emission factor
  if (item.energy_model === 'per_km' && item.uses_country_car_default) {
    const grams = cf.car_gco2_km * quantity;
    steps.push(
      step(
        'step_avg_car',
        (l, u) => `${n(cf.car_gco2_km, l)} ${u.g}CO₂/${u.km} × ${n(quantity, l)} ${u.km} = ${n(grams, l)} ${u.g}`,
        (l) => ({ country: countryName(cf.iso3, l), year: cf.car_year }),
      ),
    );
    return {
      item_id: item.id, quantity, unit: item.typical_unit, energy_kwh: null,
      carrier: item.carrier, factor_value: cf.car_gco2_km, factor_unit: 'g_per_km',
      factor_desc: { country: cf.name, year: cf.car_year, source_id: cf.car_source_id },
      grams, steps,
    };
  }

  if (item.energy_model === 'per_km' && item.l_per_100km != null) {
    const kgPerL = item.carrier === 'diesel' ? DIESEL_KGCO2_PER_L : PETROL_KGCO2_PER_L;
    const gPerKm = (item.l_per_100km / 100) * kgPerL * 1000;
    const grams = gPerKm * quantity;
    const per100 = item.l_per_100km;
    steps.push(
      step(
        item.carrier === 'diesel' ? 'step_fuel_diesel' : 'step_fuel_petrol',
        (l, u) =>
          `${n(per100, l)} ${u.L}/100 ${u.km} × ${n(kgPerL, l)} ${u.kg}CO₂/${u.L} → ${n(gPerKm, l)} ${u.g}/${u.km} × ${n(quantity, l)} ${u.km} = ${n(grams, l)} ${u.g}`,
      ),
    );
    return {
      item_id: item.id, quantity, unit: item.typical_unit, energy_kwh: null,
      carrier: item.carrier, factor_value: gPerKm, factor_unit: 'g_per_km',
      factor_desc: { year: FUEL_FACTOR_YEAR, source_id: 'desnz_2025' },
      grams, steps,
    };
  }

  if (item.energy_model === 'per_km' && item.gco2_per_km != null) {
    const grams = item.gco2_per_km * quantity;
    const factor = item.gco2_per_km;
    steps.push(
      step(
        item.per_passenger ? 'step_factor_pkm' : 'step_factor_km',
        (l, u) => `${n(factor, l)} ${u.g}CO₂/${u.km} × ${n(quantity, l)} ${u.km} = ${n(grams, l)} ${u.g}`,
      ),
    );
    return {
      item_id: item.id, quantity, unit: item.typical_unit, energy_kwh: null,
      carrier: item.carrier, factor_value: item.gco2_per_km, factor_unit: 'g_per_km',
      factor_desc: { year: item.value_year, source_id: item.source_ids[0] },
      grams, steps,
    };
  }

  if (energyKwh == null) throw new Error(`item ${item.id}: could not derive energy`);

  let factorValue: number;
  let factorDesc: Breakdown['factor_desc'];
  if (item.carrier === 'electricity') {
    const f = gridFactor(cf);
    factorValue = f.value;
    factorDesc = f.desc;
    const fv = factorValue;
    steps.push(
      step('step_grid', (l, u) => `${n(fv, l)} ${u.g}CO₂/${u.kWh}`, (l) => ({
        country: countryName(cf.iso3, l),
        year: cf.grid_year,
      })),
    );
  } else if (item.carrier === 'natural_gas' || item.carrier === 'lpg') {
    factorValue = FUEL_GCO2_PER_KWH_THERMAL[item.carrier];
    factorDesc = { year: FUEL_FACTOR_YEAR, source_id: 'desnz_2025' };
    const fv = factorValue;
    steps.push(
      step(item.carrier === 'lpg' ? 'step_combustion_lpg' : 'step_combustion_gas', (l, u) => `${n(fv, l)} ${u.g}CO₂/${u.kWh}`),
    );
  } else {
    throw new Error(`item ${item.id}: kWh path unsupported for carrier ${item.carrier}`);
  }

  const grams = energyKwh * factorValue;
  const e = energyKwh;
  const fv = factorValue;
  steps.push(
    step('step_total', (l, u) => `${n(e, l)} ${u.kWh} × ${n(fv, l)} ${u.g}/${u.kWh} = ${n(grams, l)} ${u.g} CO₂`),
  );

  return {
    item_id: item.id, quantity, unit: item.typical_unit, energy_kwh: energyKwh,
    carrier: item.carrier, factor_value: factorValue, factor_unit: 'g_per_kwh',
    factor_desc: factorDesc, efficiency, grams, steps,
  };
}

export function solveEquivalent(
  itemA: Item,
  qtyA: number,
  itemB: Item,
  cf: CountryFactors,
): { qtyB: number; gramsTarget: number; breakdownA: Breakdown; breakdownB: Breakdown } {
  const breakdownA = computeCO2(itemA, qtyA, cf);
  // all energy models are linear in quantity, so one unit gives the rate
  const gramsPerUnitB = computeCO2(itemB, 1, cf).grams;
  const qtyB = breakdownA.grams / gramsPerUnitB;
  const breakdownB = computeCO2(itemB, qtyB, cf);
  return { qtyB, gramsTarget: breakdownA.grams, breakdownA, breakdownB };
}
