import { describe, expect, it } from 'vitest';
import { getCountry, loadCountryFactors, PINNED_COUNTRIES } from '@/lib/data';

const CURRENT_YEAR = 2026;

describe('country_factors.json', () => {
  it('covers at least 150 countries', () => {
    expect(loadCountryFactors().length).toBeGreaterThanOrEqual(150);
  });

  it('includes every pinned country with fresh grid data', () => {
    for (const iso3 of PINNED_COUNTRIES) {
      const cf = getCountry(iso3);
      expect(cf.grid_year).toBeGreaterThanOrEqual(CURRENT_YEAR - 3);
      expect(cf.grid_gco2_kwh).toBeGreaterThan(0);
      expect(cf.flag.length).toBeGreaterThan(0);
    }
  });

  it('reproduces the known grid-intensity ordering: France < Germany < Poland', () => {
    expect(getCountry('FRA').grid_gco2_kwh).toBeLessThan(getCountry('DEU').grid_gco2_kwh);
    expect(getCountry('DEU').grid_gco2_kwh).toBeLessThan(getCountry('POL').grid_gco2_kwh);
  });

  it('has plausible magnitudes at the extremes', () => {
    expect(getCountry('NOR').grid_gco2_kwh).toBeLessThan(60);
    expect(getCountry('IND').grid_gco2_kwh).toBeGreaterThan(500);
  });
});
