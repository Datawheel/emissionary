/**
 * Physical constants and fuel combustion factors.
 * Combustion-only boundary (no well-to-tank), gross calorific value basis
 * for gaseous fuels — see data/SOURCES.md for the methodology statement.
 */

/** gCO2 per kWh of thermal energy, direct combustion (country-invariant). */
export const FUEL_GCO2_PER_KWH_THERMAL: Record<'natural_gas' | 'lpg', number> = {
  natural_gas: 202,
  lpg: 227,
};

/** kgCO2 per liter, 100% mineral fuel, tailpipe only. */
export const PETROL_KGCO2_PER_L = 2.31;
export const DIESEL_KGCO2_PER_L = 2.68;

/**
 * Useful energy to heat 1 L of water from 20 °C to 100 °C:
 * 1 kg × 4186 J/(kg·K) × 80 K / 3.6e6 J/kWh ≈ 0.0930 kWh.
 */
export const BOIL_KWH_PER_LITER = (1.0 * 4186 * 80) / 3.6e6;

/** Provenance for the constants above (ids resolve in data/sources.json). */
export const FUEL_SOURCE_IDS: Record<string, string[]> = {
  natural_gas: ['desnz_2025', 'ipcc_2006_v2'],
  lpg: ['desnz_2025'],
  petrol: ['desnz_2025'],
  diesel: ['desnz_2025'],
  boil_physics: ['codata_physics'],
};

export const FUEL_FACTOR_YEAR = 2025;
