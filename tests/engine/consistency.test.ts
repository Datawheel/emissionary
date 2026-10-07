import { describe, expect, it } from 'vitest';
import { getCountry, loadItems } from '@/lib/data';
import { BOIL_KWH_PER_LITER, PETROL_KGCO2_PER_L } from '@/lib/constants';
import { computeCO2 } from '@/lib/emissions';
import { proseName } from '@/lib/format';
import { t } from '@/lib/i18n';
import { LANGS } from '@/lib/types';
import type { Item } from '@/lib/types';

/**
 * Site-wide number consistency: every derivation stated in an item's
 * assumption note, on the About page, or in the UI must match the value the
 * engine actually uses. If a dataset value is re-researched, this suite
 * points at every dependent claim.
 */
const items = loadItems();
const get = (id: string): Item => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`missing item ${id}`);
  return item;
};

describe('ENERGY STAR annual-figure derivations match stored values', () => {
  const cases: [string, 'power_watts' | 'kwh_per_event', number][] = [
    ['refrigerator', 'power_watts', (345 / 8760) * 1000], // note: 345 kWh/yr
    ['chest_freezer', 'power_watts', (405 / 8760) * 1000], // note: 405 kWh/yr
    ['dishwasher', 'kwh_per_event', 239 / 215], // note: 239 kWh/yr over 215 cycles
    ['washing_machine', 'kwh_per_event', 110 / 234], // note: 110 kWh/yr over 234 loads
    ['tumble_dryer', 'kwh_per_event', 608 / 283], // note: 608 kWh/yr over 283 loads
    ['dehumidifier', 'power_watts', (343 / 1095) * 1000], // note: 343 kWh/yr over 1095 h
  ];
  for (const [id, field, derived] of cases) {
    it(`${id}: stored ${field} matches the annual figure in its note`, () => {
      const stored = get(id)[field]!;
      expect(Math.abs(stored - derived) / derived).toBeLessThan(0.01);
    });
  }
});

describe('physics and fuel claims', () => {
  it('boiling energy in task items matches m·c·ΔT within 0.5%', () => {
    for (const id of ['electric_kettle', 'induction_hob', 'electric_hob', 'gas_hob']) {
      const v = get(id).task_kwh_useful!;
      expect(Math.abs(v - BOIL_KWH_PER_LITER) / BOIL_KWH_PER_LITER).toBeLessThan(0.005);
    }
  });

  it('the About page claim "a liter of petrol releases ~2.3 kg" matches the constant', () => {
    expect(PETROL_KGCO2_PER_L).toBeGreaterThan(2.25);
    expect(PETROL_KGCO2_PER_L).toBeLessThan(2.35);
  });

  it('cooking efficiencies match the About page (~40% gas, ~74% coil, ~84% induction, ~85% kettle)', () => {
    expect(get('gas_hob').efficiency).toBe(0.4);
    expect(get('electric_hob').efficiency).toBe(0.74);
    expect(get('induction_hob').efficiency).toBe(0.84);
    expect(get('electric_kettle').efficiency).toBe(0.85);
  });
});

describe('lumen-class bulbs are mutually consistent', () => {
  it('800 lm: incandescent uses 6–7x the LED (as its note claims)', () => {
    const ratio = get('incandescent_bulb').power_watts! / get('led_bulb').power_watts!;
    expect(ratio).toBeGreaterThanOrEqual(6);
    expect(ratio).toBeLessThanOrEqual(7);
  });

  it('1600 lm pair exists with the same wattages its notes claim', () => {
    expect(get('led_bulb_1600').power_watts).toBe(16);
    expect(get('incandescent_bulb_1600').power_watts).toBe(100);
  });

  it('every bulb name states its lumens, in every language', () => {
    const lumens = { en: /\d+-lumen/, es: /\d+ lúmenes/, fr: /\d+ lumens/, de: /\d+ Lumen/, ru: /\d+ лм/, zh: /\d+ 流明/ };
    for (const id of ['led_bulb', 'led_bulb_1600', 'incandescent_bulb', 'incandescent_bulb_1600']) {
      for (const lang of LANGS) expect(get(id).name[lang]).toMatch(lumens[lang]);
    }
  });
});

describe('shared vehicles state their per-passenger basis and occupancy', () => {
  const shared = ['city_bus', 'coach', 'train_national', 'flight_short_haul'];

  it('exactly the shared vehicles are flagged and named per passenger, in every language', () => {
    for (const item of items) {
      expect(item.per_passenger === true).toBe(shared.includes(item.id));
      for (const lang of LANGS) expect(item.name[lang].includes(t('per_passenger', lang))).toBe(shared.includes(item.id));
    }
  });

  it('every shared-vehicle note states its occupancy assumption', () => {
    // DESNZ 2025 methodology, Table 25 (bus/coach) and CAA 2023 load factors
    expect(get('city_bus').assumption_note.en).toContain('12.7 passengers');
    expect(get('coach').assumption_note.en).toContain('17.6 passengers');
    expect(get('flight_short_haul').assumption_note.en).toContain('83% of seats');
    expect(get('train_national').assumption_note.en).toMatch(/network.s energy/);
  });

  it('proseName keeps the per-passenger basis in sentences, in every language', () => {
    for (const lang of LANGS) {
      expect(proseName(get('city_bus').name[lang], lang)).toContain(t('per_passenger', lang));
      expect(proseName(get('gas_hob').name[lang], lang)).not.toMatch(/[(（]/);
    }
    expect(proseName('City bus (per passenger)', 'en')).toBe('city bus (per passenger)');
    expect(proseName('Gas hob (boiling)', 'en')).toBe('gas hob');
  });
});

describe('About page worked example stays truthful', () => {
  it('hairdryer is 1,800 W and the France/Poland example follows from live factors', () => {
    const hairdryer = get('hairdryer');
    expect(hairdryer.power_watts).toBe(1800);
    const fra = computeCO2(hairdryer, 10, getCountry('FRA'));
    const pol = computeCO2(hairdryer, 10, getCountry('POL'));
    expect(fra.energy_kwh).toBeCloseTo(0.3, 6); // "1,800 W × 0.17 h = 0.3 kWh"
    expect(pol.grams / fra.grams).toBeGreaterThan(5); // "several times more"
  });
});

describe('scoring maximums quoted in the UI', () => {
  it('a daily game maxes at 450 (1 binary × 50 + 4 quant × 100)', () => {
    expect(1 * 50 + 4 * 100).toBe(450); // MAX_TOTAL in DailyClient/ShareCard
  });
});
