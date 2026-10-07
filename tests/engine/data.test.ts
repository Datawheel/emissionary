import { describe, expect, it } from 'vitest';
import { itemSchema } from '@/lib/data';
import { loc } from '../helpers/loc';

const validItem = {
  id: 'hairdryer',
  name: loc('Hairdryer', 'Secador de pelo'),
  emoji: '💨',
  category: 'personal_care',
  energy_model: 'power',
  power_watts: 1800,
  carrier: 'electricity',
  typical_unit: 'minutes',
  assumption_note: loc('Typical 1800 W consumer hairdryer.', 'Secador de 1800 W típico.'),
  source_ids: ['doe_energysaver'],
  value_year: 2025,
  difficulty: 2,
};

describe('itemSchema', () => {
  it('accepts a valid power-model item', () => {
    expect(itemSchema.parse(validItem).id).toBe('hairdryer');
  });

  it('rejects an item missing any language', () => {
    const { zh: _omitted, ...noChinese } = validItem.name;
    expect(() => itemSchema.parse({ ...validItem, name: noChinese })).toThrow();
  });

  it('rejects an item with no sources', () => {
    expect(() => itemSchema.parse({ ...validItem, source_ids: [] })).toThrow();
  });

  it('rejects a power-model item missing power_watts', () => {
    const { power_watts: _omitted, ...rest } = validItem;
    expect(() => itemSchema.parse(rest)).toThrow(/requires power_watts/);
  });

  it('rejects a task-model item missing efficiency', () => {
    expect(() =>
      itemSchema.parse({
        ...validItem,
        id: 'kettle',
        energy_model: 'task',
        task_kwh_useful: 0.093,
      }),
    ).toThrow(/task model requires/);
  });

  it('rejects per_km with both kwh_per_km and country default', () => {
    expect(() =>
      itemSchema.parse({
        ...validItem,
        id: 'weird_car',
        energy_model: 'per_km',
        kwh_per_km: 0.17,
        uses_country_car_default: true,
        typical_unit: 'km',
      }),
    ).toThrow(/exactly one/);
  });

  it('rejects per_km electric consumption on a fuel carrier', () => {
    expect(() =>
      itemSchema.parse({
        ...validItem,
        id: 'ev',
        energy_model: 'per_km',
        kwh_per_km: 0.17,
        carrier: 'petrol',
        typical_unit: 'km',
      }),
    ).toThrow(/carrier=electricity/);
  });
});
