/**
 * Physical constants and fuel combustion factors.
 * Combustion-only boundary (no well-to-tank), gross calorific value basis
 * for gaseous fuels — see data/SOURCES.md for the methodology statement.
 */

/**
 * gCO2 per kWh of thermal energy, direct combustion (country-invariant).
 * DESNZ 2025 conversion factors, CO2-only component, GROSS calorific value
 * basis — the basis on which gas is metered and on which US DOE appliance
 * efficiencies are measured, so task-model efficiencies pair consistently.
 * (Net-CV equivalents: natural gas 202.3, LPG 230.0 gCO2/kWh.)
 */
export const FUEL_GCO2_PER_KWH_THERMAL: Record<'natural_gas' | 'lpg', number> = {
  natural_gas: 182.59,
  lpg: 214.19,
};

/** kgCO2 per liter, 100% mineral fuel, tailpipe CO2 only (DESNZ 2025). */
export const PETROL_KGCO2_PER_L = 2.32567;
export const DIESEL_KGCO2_PER_L = 2.62818;

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
