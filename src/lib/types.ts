export type Carrier = 'electricity' | 'natural_gas' | 'lpg' | 'petrol' | 'diesel';
export type EnergyModel = 'power' | 'per_event' | 'task' | 'per_km';
export type Unit = 'minutes' | 'hours' | 'events' | 'km' | 'liters_boiled';
export type Lang = 'en' | 'es';

export interface Localized {
  en: string;
  es: string;
}

export interface Item {
  id: string;
  name: Localized;
  emoji: string;
  category: string;
  energy_model: EnergyModel;
  /** model=power: rated power draw in watts */
  power_watts?: number;
  /** model=per_event: consumed kWh per event (cycle, load, charge) */
  kwh_per_event?: number;
  event_noun?: Localized;
  /** model=task: useful kWh per unit of task (e.g. per liter boiled) */
  task_kwh_useful?: number;
  /** model=task: device efficiency, 0–1 */
  efficiency?: number;
  carrier: Carrier;
  /** model=per_km, carrier=electricity */
  kwh_per_km?: number;
  /** model=per_km fuel car: use country fleet-average gCO2/km */
  uses_country_car_default?: boolean;
  /** model=per_km fuel vehicle with fixed consumption (e.g. scooter) */
  l_per_100km?: number;
  /** model=per_km with a direct emission factor (e.g. bus per passenger-km) */
  gco2_per_km?: number;
  typical_unit: Unit;
  /** override of the natural clue quantities offered for this item (in typical_unit) */
  clue_quantities?: number[];
  assumption_note: Localized;
  /** provenance for every physical value on this item */
  source_ids: string[];
  /** reference year of the physical value */
  value_year: number;
  difficulty: 1 | 2 | 3;
}

export interface CountryFactors {
  iso3: string;
  name: string;
  flag: string;
  grid_gco2_kwh: number;
  grid_year: number;
  grid_source_id: string;
  car_gco2_km: number;
  car_year: number;
  car_source_id: string;
  car_is_fallback: boolean;
}

export interface Source {
  source_id: string;
  publisher: string;
  title: string;
  year: number;
  url: string;
  license: string;
  /** ISO date the value was retrieved/verified */
  retrieved_at: string;
}

export interface Equivalence {
  id: string;
  gco2: number;
  label: Localized;
}
