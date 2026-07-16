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
import type { Carrier, CountryFactors, Item, Unit } from './types';

export interface BreakdownStep {
  label_en: string;
  label_es: string;
  math: string;
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
      steps.push({
        label_en: 'Energy consumed',
        label_es: 'Energía consumida',
        math: `${item.power_watts} W × ${r3(hours)} h ÷ 1000 = ${r3(energyKwh)} kWh`,
      });
      break;
    }
    case 'per_event': {
      energyKwh = item.kwh_per_event! * quantity;
      steps.push({
        label_en: 'Energy consumed',
        label_es: 'Energía consumida',
        math: `${item.kwh_per_event} kWh × ${r3(quantity)} = ${r3(energyKwh)} kWh`,
      });
      break;
    }
    case 'task': {
      efficiency = item.efficiency!;
      const useful = item.task_kwh_useful! * quantity;
      energyKwh = useful / efficiency;
      steps.push({
        label_en: 'Useful energy (physics)',
        label_es: 'Energía útil (física)',
        math: `${r3(item.task_kwh_useful!)} kWh × ${r3(quantity)} = ${r3(useful)} kWh`,
      });
      steps.push({
        label_en: `Device efficiency ${Math.round(efficiency * 100)}%`,
        label_es: `Eficiencia del aparato ${Math.round(efficiency * 100)}%`,
        math: `${r3(useful)} kWh ÷ ${efficiency} = ${r3(energyKwh)} kWh`,
      });
      break;
    }
    case 'per_km': {
      if (item.kwh_per_km != null) {
        energyKwh = item.kwh_per_km * quantity;
        steps.push({
          label_en: 'Energy consumed',
          label_es: 'Energía consumida',
          math: `${item.kwh_per_km} kWh/km × ${r3(quantity)} km = ${r3(energyKwh)} kWh`,
        });
      }
      // uses_country_car_default / l_per_100km / gco2_per_km handled below
      break;
    }
  }

  // 2) apply the carrier's emission factor
  if (item.energy_model === 'per_km' && item.uses_country_car_default) {
    const grams = cf.car_gco2_km * quantity;
    steps.push({
      label_en: `Average car (${cf.name}, ${cf.car_year})`,
      label_es: `Coche promedio (${cf.name}, ${cf.car_year})`,
      math: `${cf.car_gco2_km} gCO₂/km × ${r3(quantity)} km = ${r3(grams)} g`,
    });
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
    steps.push({
      label_en: `Fuel burned (${item.carrier})`,
      label_es: `Combustible quemado (${item.carrier === 'diesel' ? 'diésel' : 'gasolina'})`,
      math: `${item.l_per_100km} L/100km × ${kgPerL} kgCO₂/L → ${r3(gPerKm)} g/km × ${r3(quantity)} km = ${r3(grams)} g`,
    });
    return {
      item_id: item.id, quantity, unit: item.typical_unit, energy_kwh: null,
      carrier: item.carrier, factor_value: gPerKm, factor_unit: 'g_per_km',
      factor_desc: { year: FUEL_FACTOR_YEAR, source_id: 'desnz_2025' },
      grams, steps,
    };
  }

  if (item.energy_model === 'per_km' && item.gco2_per_km != null) {
    const grams = item.gco2_per_km * quantity;
    steps.push({
      label_en: 'Emission factor per passenger-km',
      label_es: 'Factor de emisión por pasajero-km',
      math: `${item.gco2_per_km} gCO₂/km × ${r3(quantity)} km = ${r3(grams)} g`,
    });
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
    steps.push({
      label_en: `Grid intensity (${cf.name}, ${cf.grid_year}, Ember)`,
      label_es: `Intensidad de la red (${cf.name}, ${cf.grid_year}, Ember)`,
      math: `${factorValue} gCO₂/kWh`,
    });
  } else if (item.carrier === 'natural_gas' || item.carrier === 'lpg') {
    factorValue = FUEL_GCO2_PER_KWH_THERMAL[item.carrier];
    factorDesc = { year: FUEL_FACTOR_YEAR, source_id: 'desnz_2025' };
    steps.push({
      label_en: `${item.carrier === 'lpg' ? 'LPG' : 'Natural gas'} combustion factor (country-invariant)`,
      label_es: `Factor de combustión de ${item.carrier === 'lpg' ? 'GLP' : 'gas natural'} (no varía por país)`,
      math: `${factorValue} gCO₂/kWh térmico`,
    });
  } else {
    throw new Error(`item ${item.id}: kWh path unsupported for carrier ${item.carrier}`);
  }

  const grams = energyKwh * factorValue;
  steps.push({
    label_en: 'Total emissions',
    label_es: 'Emisiones totales',
    math: `${r3(energyKwh)} kWh × ${factorValue} g/kWh = ${r3(grams)} g CO₂`,
  });

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
