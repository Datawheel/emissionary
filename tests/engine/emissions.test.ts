import { describe, expect, it } from 'vitest';
import { computeCO2, solveEquivalent } from '@/lib/emissions';
import { BOIL_KWH_PER_LITER, FUEL_GCO2_PER_KWH_THERMAL } from '@/lib/constants';
import { getCountry } from '@/lib/data';
import type { Item } from '@/lib/types';

const note = { en: 'test', es: 'test' };
const base = { category: 'test', assumption_note: note, source_ids: ['test'], value_year: 2025, difficulty: 1 as const };

const hairdryer: Item = {
  ...base, id: 'hairdryer', name: { en: 'Hairdryer', es: 'Secador' }, emoji: '💨',
  energy_model: 'power', power_watts: 1800, carrier: 'electricity', typical_unit: 'minutes',
};
const fridge: Item = {
  ...base, id: 'fridge', name: { en: 'Refrigerator', es: 'Nevera' }, emoji: '🧊',
  energy_model: 'power', power_watts: 28.5, carrier: 'electricity', typical_unit: 'hours',
};
const kettle: Item = {
  ...base, id: 'kettle', name: { en: 'Kettle', es: 'Hervidor' }, emoji: '🫖',
  energy_model: 'task', task_kwh_useful: BOIL_KWH_PER_LITER, efficiency: 0.85,
  carrier: 'electricity', typical_unit: 'liters_boiled',
};
const gasHob: Item = {
  ...base, id: 'gas_hob', name: { en: 'Gas hob', es: 'Fogón de gas' }, emoji: '🔥',
  energy_model: 'task', task_kwh_useful: BOIL_KWH_PER_LITER, efficiency: 0.4,
  carrier: 'natural_gas', typical_unit: 'liters_boiled',
};
const petrolCar: Item = {
  ...base, id: 'petrol_car', name: { en: 'Petrol car', es: 'Coche de gasolina' }, emoji: '🚗',
  energy_model: 'per_km', uses_country_car_default: true, carrier: 'petrol', typical_unit: 'km',
};
const ev: Item = {
  ...base, id: 'ev', name: { en: 'Electric car', es: 'Coche eléctrico' }, emoji: '🔌',
  energy_model: 'per_km', kwh_per_km: 0.17, carrier: 'electricity', typical_unit: 'km',
};

describe('computeCO2', () => {
  it('computes a power item: 10 min hairdryer in France', () => {
    const fra = getCountry('FRA');
    const b = computeCO2(hairdryer, 10, fra);
    // 1800 W × (10/60) h / 1000 = 0.3 kWh × grid
    expect(b.energy_kwh).toBeCloseTo(0.3, 6);
    expect(b.grams).toBeCloseTo(0.3 * fra.grid_gco2_kwh, 4);
    expect(b.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('is linear in quantity', () => {
    const fra = getCountry('FRA');
    expect(computeCO2(hairdryer, 20, fra).grams).toBeCloseTo(2 * computeCO2(hairdryer, 10, fra).grams, 8);
  });

  it('computes a fuel task item country-invariantly', () => {
    const g1 = computeCO2(gasHob, 1, getCountry('FRA')).grams;
    const g2 = computeCO2(gasHob, 1, getCountry('POL')).grams;
    expect(g1).toBeCloseTo(g2, 8);
    // 0.093 kWh / 0.40 × 202 g/kWh ≈ 47 g
    expect(g1).toBeCloseTo((BOIL_KWH_PER_LITER / 0.4) * FUEL_GCO2_PER_KWH_THERMAL.natural_gas, 3);
  });

  it('uses the country car default for petrol cars', () => {
    const fra = getCountry('FRA');
    const b = computeCO2(petrolCar, 10, fra);
    expect(b.grams).toBeCloseTo(10 * fra.car_gco2_km, 6);
    expect(b.factor_unit).toBe('g_per_km');
  });

  it('rejects non-positive quantities', () => {
    expect(() => computeCO2(hairdryer, 0, getCountry('FRA'))).toThrow();
  });
});

describe('flagship: boiling 1 L of water (spec §16 acceptance)', () => {
  it('kettle beats gas hob by 6–12x in France', () => {
    const fra = getCountry('FRA');
    const kettleG = computeCO2(kettle, 1, fra).grams;
    const gasG = computeCO2(gasHob, 1, fra).grams;
    expect(gasG / kettleG).toBeGreaterThan(6);
    expect(gasG / kettleG).toBeLessThan(12);
  });

  it('gas hob wins in Poland', () => {
    const pol = getCountry('POL');
    expect(computeCO2(gasHob, 1, pol).grams).toBeLessThan(computeCO2(kettle, 1, pol).grams);
  });

  it('kettle wins overwhelmingly in Norway', () => {
    const nor = getCountry('NOR');
    const ratio = computeCO2(gasHob, 1, nor).grams / computeCO2(kettle, 1, nor).grams;
    expect(ratio).toBeGreaterThan(10);
  });
});

describe('EV vs petrol across grids (spec §4.4 cross-check)', () => {
  it('EV wins in Norway and the gap narrows sharply in India', () => {
    const nor = getCountry('NOR');
    const ind = getCountry('IND');
    const evNor = computeCO2(ev, 100, nor).grams;
    const petrolNor = computeCO2(petrolCar, 100, nor).grams;
    const evInd = computeCO2(ev, 100, ind).grams;
    const petrolInd = computeCO2(petrolCar, 100, ind).grams;
    expect(evNor).toBeLessThan(petrolNor / 10);
    expect(evInd / petrolInd).toBeGreaterThan(5 * (evNor / petrolNor));
  });
});

describe('solveEquivalent', () => {
  it('inverts computeCO2: equivalent fridge-hours of 10 min hairdryer', () => {
    const fra = getCountry('FRA');
    const { qtyB, gramsTarget, breakdownB } = solveEquivalent(hairdryer, 10, fridge, fra);
    // 0.3 kWh vs 28.5 W → 0.3/0.0285 ≈ 10.53 hours, grid factor cancels
    expect(qtyB).toBeCloseTo(0.3 / 0.0285, 4);
    expect(breakdownB.grams).toBeCloseTo(gramsTarget, 6);
  });

  it('crosses carriers: liters of gas-hob boiling equivalent to kettle boiling differs by country', () => {
    const fra = solveEquivalent(kettle, 1, gasHob, getCountry('FRA')).qtyB;
    const pol = solveEquivalent(kettle, 1, gasHob, getCountry('POL')).qtyB;
    expect(fra).toBeLessThan(0.2); // in France a kettle-liter is worth only a small fraction of a gas-hob liter
    expect(pol).toBeGreaterThan(1); // in Poland the kettle emits more than the gas hob per liter
  });
});
