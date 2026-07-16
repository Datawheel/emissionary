import { describe, expect, it } from 'vitest';
import {
  BOIL_KWH_PER_LITER,
  DIESEL_KGCO2_PER_L,
  FUEL_GCO2_PER_KWH_THERMAL,
  PETROL_KGCO2_PER_L,
} from '@/lib/constants';

describe('fuel combustion factors (DESNZ 2025, CO2-only)', () => {
  it('natural gas gross-CV factor is in the verified band', () => {
    expect(FUEL_GCO2_PER_KWH_THERMAL.natural_gas).toBeGreaterThan(175);
    expect(FUEL_GCO2_PER_KWH_THERMAL.natural_gas).toBeLessThan(190);
  });

  it('LPG gross-CV factor is in the verified band', () => {
    expect(FUEL_GCO2_PER_KWH_THERMAL.lpg).toBeGreaterThan(205);
    expect(FUEL_GCO2_PER_KWH_THERMAL.lpg).toBeLessThan(222);
  });

  it('mineral petrol and diesel per-liter factors match DESNZ 2025', () => {
    expect(PETROL_KGCO2_PER_L).toBeCloseTo(2.32567, 4);
    expect(DIESEL_KGCO2_PER_L).toBeCloseTo(2.62818, 4);
    expect(DIESEL_KGCO2_PER_L).toBeGreaterThan(PETROL_KGCO2_PER_L); // denser fuel
  });

  it('boiling energy matches m·c·ΔT for 20→100 °C', () => {
    expect(BOIL_KWH_PER_LITER).toBeCloseTo(0.093, 3);
    expect(BOIL_KWH_PER_LITER).toBeCloseTo((4186 * 80) / 3.6e6, 8);
  });
});
