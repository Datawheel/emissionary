import { describe, expect, it } from 'vitest';
import { generateDailySet, logPosition, pairKey, seededRng, selectQuantRound, sliderBounds } from '@/lib/rounds';
import { positionToValue, valueToPosition } from '@/lib/slider-math';
import { getCountry } from '@/lib/data';
import { BOIL_KWH_PER_LITER } from '@/lib/constants';
import type { Item } from '@/lib/types';

const note = { en: 'test', es: 'test' };
const base = { category: 'test', assumption_note: note, source_ids: ['test'], value_year: 2025 };

function powerItem(id: string, watts: number, difficulty: 1 | 2 | 3, unit: 'minutes' | 'hours' = 'minutes'): Item {
  return {
    ...base, id, name: { en: id, es: id }, emoji: '⚡', energy_model: 'power',
    power_watts: watts, carrier: 'electricity', typical_unit: unit, difficulty,
  };
}

const pool: Item[] = [
  powerItem('hairdryer', 1800, 1),
  powerItem('toaster', 1000, 1),
  powerItem('fridge', 28.5, 2, 'hours'),
  powerItem('gaming_pc', 350, 1, 'hours'),
  powerItem('tv', 90, 1, 'hours'),
  {
    ...base, id: 'kettle', name: { en: 'Kettle', es: 'Hervidor' }, emoji: '🫖', energy_model: 'task',
    task_kwh_useful: BOIL_KWH_PER_LITER, efficiency: 0.85, carrier: 'electricity',
    typical_unit: 'liters_boiled', difficulty: 2,
  },
  {
    ...base, id: 'gas_hob', name: { en: 'Gas hob', es: 'Fogón' }, emoji: '🔥', energy_model: 'task',
    task_kwh_useful: BOIL_KWH_PER_LITER, efficiency: 0.4, carrier: 'natural_gas',
    typical_unit: 'liters_boiled', difficulty: 3,
  },
  {
    ...base, id: 'petrol_car', name: { en: 'Car', es: 'Coche' }, emoji: '🚗', energy_model: 'per_km',
    uses_country_car_default: true, carrier: 'petrol', typical_unit: 'km', difficulty: 2,
  },
];

describe('seededRng', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const a1 = Array.from({ length: 5 }, seededRng('salt:2026-07-16'));
    const a2 = Array.from({ length: 5 }, seededRng('salt:2026-07-16'));
    const b = Array.from({ length: 5 }, seededRng('salt:2026-07-17'));
    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(b);
    for (const v of a1) expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('sliderBounds', () => {
  it('spans at least 100x and contains the truth at least 10x from each edge', () => {
    const rng = seededRng('bounds');
    for (const truth of [0.5, 3, 47, 1200]) {
      const { min, max } = sliderBounds(truth, rng);
      expect(max / min).toBeGreaterThanOrEqual(100);
      expect(truth / min).toBeGreaterThanOrEqual(10 * 0.98);
      expect(max / truth).toBeGreaterThanOrEqual(10 * 0.98);
    }
  });

  it('always displaces the truth from the slider center (anti "guess the middle")', () => {
    const rng = seededRng('anticenter');
    const offsets: number[] = [];
    for (let i = 0; i < 200; i++) {
      const { min, max } = sliderBounds(100, rng);
      const center = Math.sqrt(min * max);
      offsets.push(Math.abs(Math.log10(100 / center)));
    }
    // every round: center is ≥ ~0.25 decades from truth (≈ 1.8×), so a
    // center-click cannot reliably score well
    expect(Math.min(...offsets)).toBeGreaterThan(0.25);
    expect(Math.max(...offsets)).toBeLessThan(0.9);
    // both sides occur
    const sides = new Set(
      Array.from({ length: 50 }, () => {
        const { min, max } = sliderBounds(100, rng);
        return Math.sqrt(min * max) > 100;
      }),
    );
    expect(sides.size).toBe(2);
  });

  it('caps the average score of a center-click strategy', () => {
    const rng = seededRng('centerclick');
    let total = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const { min, max } = sliderBounds(100, rng);
      const center = Math.sqrt(min * max);
      const e = Math.abs(Math.log10(center / 100));
      total += Math.max(0, Math.round((100 * (1 - e)) / (1 - Math.log10(1.1))));
    }
    expect(total / N).toBeLessThan(60);
  });
});

describe('LogSlider mapping', () => {
  it('round-trips values and hits the endpoints', () => {
    expect(positionToValue(0, 2, 2000)).toBeCloseTo(2, 8);
    expect(positionToValue(1000, 2, 2000)).toBeCloseTo(2000, 6);
    for (const v of [2, 17, 250, 1999]) {
      const back = positionToValue(valueToPosition(v, 2, 2000), 2, 2000);
      expect(Math.abs(Math.log10(back / v))).toBeLessThan(0.01);
    }
  });
});

describe('selectQuantRound', () => {
  it('never pairs an item with itself and respects cross-carrier requirement', () => {
    const rng = seededRng('select');
    const fra = getCountry('FRA');
    for (let i = 0; i < 25; i++) {
      const r = selectQuantRound(pool, fra, rng, { difficulty: 3, requireCrossCarrier: true });
      expect(r.item_a).not.toBe(r.item_b);
      const a = pool.find((x) => x.id === r.item_a)!;
      const b = pool.find((x) => x.id === r.item_b)!;
      expect((a.carrier === 'electricity') !== (b.carrier === 'electricity')).toBe(true);
    }
  });
});

describe('generateDailySet', () => {
  it('is deterministic for a given date and salt', () => {
    const fra = getCountry('FRA');
    const s1 = generateDailySet(pool, fra, '2026-07-16', 'test-salt');
    const s2 = generateDailySet(pool, fra, '2026-07-16', 'test-salt');
    expect(s1).toEqual(s2);
  });

  it('satisfies the §6.3 constraints across many dates', () => {
    const fra = getCountry('FRA');
    for (let d = 1; d <= 30; d++) {
      const set = generateDailySet(pool, fra, `2026-08-${String(d).padStart(2, '0')}`, 'test-salt');
      expect(set).toHaveLength(5);
      expect(set[0].round_type).toBe('binary');
      expect(set[0].qty_b).toBeGreaterThan(0);
      const pairs = new Set(set.map((r) => pairKey(r.item_a, r.item_b)));
      expect(pairs.size).toBe(5); // no repeated pairs
      const cross = set.filter((r) => {
        const a = pool.find((x) => x.id === r.item_a)!;
        const b = pool.find((x) => x.id === r.item_b)!;
        return (a.carrier === 'electricity') !== (b.carrier === 'electricity');
      });
      expect(cross.length).toBeGreaterThanOrEqual(2);
      const quantDiffs = set.slice(1).map((r) => r.difficulty);
      for (let i = 1; i < quantDiffs.length; i++) {
        expect(quantDiffs[i]).toBeGreaterThanOrEqual(quantDiffs[i - 1]); // ramp
      }
    }
  });

  it('produces different sets on different dates', () => {
    const fra = getCountry('FRA');
    const a = generateDailySet(pool, fra, '2026-07-16', 'test-salt');
    const b = generateDailySet(pool, fra, '2026-07-17', 'test-salt');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
