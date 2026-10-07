/**
 * Builds data/items.json from the verified research values gathered on
 * 2026-07-16 (see data/sources.json and data/SOURCES.md for provenance).
 * Values marked source doe_energysaver are product-class conventions pending
 * EPREL/measured verification; all others come from named datasets/documents.
 *
 * Usage: npx tsx scripts/build-items.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Item, LocalizedPlural, PluralForms } from '../src/lib/types';
import { ITEMS_FR } from './i18n/items-fr';
import { ITEMS_DE } from './i18n/items-de';
import { ITEMS_RU } from './i18n/items-ru';
import { ITEMS_ZH } from './i18n/items-zh';

const BOIL = 0.093; // kWh useful per liter, 20→100 °C (NIST water properties)

/** English and Spanish live inline; French, German, Russian and Chinese in scripts/i18n/. */
type Draft = Omit<Item, 'name' | 'assumption_note' | 'event_noun'> & {
  name: { en: string; es: string };
  note_en: string;
  note_es: string;
  event_noun?: { en: PluralForms; es: PluralForms };
};

const TRANSLATIONS = { fr: ITEMS_FR, de: ITEMS_DE, ru: ITEMS_RU, zh: ITEMS_ZH };

function item(p: Draft): Item {
  const { note_en, note_es, name, event_noun, ...rest } = p;
  const tr = Object.fromEntries(
    Object.entries(TRANSLATIONS).map(([lang, table]) => {
      const entry = table[p.id];
      if (!entry) throw new Error(`${p.id}: missing ${lang} translation`);
      if (event_noun && !entry.event) throw new Error(`${p.id}: missing ${lang} event noun`);
      return [lang, entry];
    }),
  ) as Record<keyof typeof TRANSLATIONS, (typeof ITEMS_FR)[string]>;
  return {
    ...rest,
    name: { ...name, fr: tr.fr.name, de: tr.de.name, ru: tr.ru.name, zh: tr.zh.name },
    ...(event_noun && {
      event_noun: {
        ...event_noun,
        fr: tr.fr.event!,
        de: tr.de.event!,
        ru: tr.ru.event!,
        zh: tr.zh.event!,
      } satisfies LocalizedPlural,
    }),
    assumption_note: { en: note_en, es: note_es, fr: tr.fr.note, de: tr.de.note, ru: tr.ru.note, zh: tr.zh.note },
  };
}

const ES_YEAR = 2026; // ENERGY STAR dataset medians retrieved 2026-07-16

const items: Item[] = [
  // ——— Kitchen: boiling tasks (the flagship set) ———
  item({
    id: 'electric_kettle', name: { en: 'Electric kettle', es: 'Hervidor eléctrico' }, emoji: '🫖',
    category: 'kitchen', energy_model: 'task', task_kwh_useful: BOIL, efficiency: 0.85,
    carrier: 'electricity', typical_unit: 'liters_boiled',
    note_en: 'Boiling 1 L of 20 °C water needs 0.093 kWh of heat; an immersed-element kettle delivers ~85% of its electricity to the water (range 80–90%).',
    note_es: 'Hervir 1 L de agua a 20 °C requiere 0,093 kWh de calor; un hervidor de resistencia sumergida transfiere ~85% de su electricidad al agua (rango 80–90%).',
    source_ids: ['codata_physics', 'doe_tsd_cooking'], value_year: 2009, difficulty: 2,
  }),
  item({
    id: 'induction_hob', name: { en: 'Induction hob (boiling)', es: 'Placa de inducción (hervir)' }, emoji: '🧲',
    category: 'kitchen', energy_model: 'task', task_kwh_useful: BOIL, efficiency: 0.84,
    carrier: 'electricity', typical_unit: 'liters_boiled',
    note_en: 'Induction cooking efficiency ~84% (ENERGY STAR residential induction cooking tops program).',
    note_es: 'Eficiencia de cocción por inducción ~84% (programa ENERGY STAR de placas de inducción residenciales).',
    source_ids: ['codata_physics', 'energystar_induction'], value_year: 2021, difficulty: 2,
  }),
  item({
    id: 'electric_hob', name: { en: 'Electric coil hob (boiling)', es: 'Placa eléctrica de resistencia (hervir)' }, emoji: '🍳',
    category: 'kitchen', energy_model: 'task', task_kwh_useful: BOIL, efficiency: 0.74,
    carrier: 'electricity', typical_unit: 'liters_boiled',
    note_en: 'Electric coil cooktop cooking efficiency ~74% (US DOE Technical Support Document for residential cooking products).',
    note_es: 'Eficiencia de cocción de placa eléctrica de resistencia ~74% (documento técnico del DOE de EE. UU. sobre productos de cocción residenciales).',
    source_ids: ['codata_physics', 'doe_tsd_cooking'], value_year: 2009, difficulty: 2,
  }),
  item({
    id: 'gas_hob', name: { en: 'Gas hob (boiling)', es: 'Fogón de gas (hervir)' }, emoji: '🔥',
    category: 'kitchen', energy_model: 'task', task_kwh_useful: BOIL, efficiency: 0.4,
    carrier: 'natural_gas', typical_unit: 'liters_boiled',
    note_en: 'Gas cooktop cooking efficiency ~40% (US DOE TSD, HHV basis) × natural-gas combustion factor 182.6 gCO₂/kWh gross (DESNZ 2025, CO₂ only). Country-invariant.',
    note_es: 'Eficiencia de cocción a gas ~40% (DOE de EE. UU., base PCS) × factor de combustión del gas natural 182,6 gCO₂/kWh bruto (DESNZ 2025, solo CO₂). No varía por país.',
    source_ids: ['codata_physics', 'doe_tsd_cooking', 'desnz_2025'], value_year: 2025, difficulty: 3,
  }),
  // ——— Kitchen: appliances ———
  item({
    id: 'refrigerator', name: { en: 'Refrigerator', es: 'Nevera' }, emoji: '🧊',
    category: 'kitchen', energy_model: 'power', power_watts: 39.4,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified refrigerator uses 345 kWh/yr (n=4,659, ENERGY STAR dataset) ≈ 39.4 W averaged over the year, compressor cycling included.',
    note_es: 'La nevera certificada mediana consume 345 kWh/año (n=4.659, base de datos ENERGY STAR) ≈ 39,4 W promediados en el año, incluidos los ciclos del compresor.',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'chest_freezer', name: { en: 'Freezer', es: 'Congelador' }, emoji: '❄️',
    category: 'kitchen', energy_model: 'power', power_watts: 46.2,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified freezer uses 405 kWh/yr (n=659, ENERGY STAR dataset) ≈ 46.2 W year-round average.',
    note_es: 'El congelador certificado mediano consume 405 kWh/año (n=659, base ENERGY STAR) ≈ 46,2 W de promedio anual.',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'dishwasher', name: { en: 'Dishwasher', es: 'Lavavajillas' }, emoji: '🍽️',
    category: 'kitchen', energy_model: 'per_event', kwh_per_event: 1.11,
    event_noun: { en: { one: 'cycle', other: 'cycles' }, es: { one: 'ciclo', other: 'ciclos' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'Median certified dishwasher: 239 kWh/yr over the 215-cycle federal test basis ≈ 1.11 kWh per cycle (n=736, ENERGY STAR dataset), water heating included.',
    note_es: 'Lavavajillas certificado mediano: 239 kWh/año sobre la base federal de 215 ciclos ≈ 1,11 kWh por ciclo (n=736, base ENERGY STAR), incluido el calentamiento de agua.',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'microwave', name: { en: 'Microwave oven', es: 'Horno microondas' }, emoji: '🍿',
    category: 'kitchen', energy_model: 'power', power_watts: 1100,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [2, 5, 10, 15],
    note_en: 'Typical countertop microwave draws ~1,100 W while heating (product-class rated input, range 900–1,500 W). Pending certified-dataset verification.',
    note_es: 'Un microondas de encimera típico consume ~1.100 W en funcionamiento (potencia nominal de la clase de producto, rango 900–1.500 W). Pendiente de verificación con datos certificados.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'electric_oven', name: { en: 'Electric oven', es: 'Horno eléctrico' }, emoji: '🥧',
    category: 'kitchen', energy_model: 'power', power_watts: 2000,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [30, 45, 60, 90],
    note_en: 'Electric oven at ~200 °C averages ~2.0 kWh per hour of use, element cycling included (product-class convention). Pending certified-dataset verification.',
    note_es: 'Un horno eléctrico a ~200 °C consume de media ~2,0 kWh por hora de uso, incluidos los ciclos de la resistencia (convención de la clase de producto). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 2,
  }),
  item({
    id: 'gas_oven', name: { en: 'Gas oven', es: 'Horno de gas' }, emoji: '🍗',
    category: 'kitchen', energy_model: 'power', power_watts: 3000,
    carrier: 'natural_gas', typical_unit: 'minutes',
    clue_quantities: [30, 45, 60, 90],
    note_en: 'Gas oven at ~200 °C burns ~3.0 kWh of gas per hour of use (thermal, burner cycling included; product-class convention). Country-invariant.',
    note_es: 'Un horno de gas a ~200 °C quema ~3,0 kWh de gas por hora de uso (térmico, incluidos ciclos del quemador; convención de la clase de producto). No varía por país.',
    source_ids: ['doe_energysaver', 'desnz_2025'], value_year: 2026, difficulty: 3,
  }),
  item({
    id: 'espresso_machine', name: { en: 'Espresso machine', es: 'Cafetera espresso' }, emoji: '☕',
    category: 'kitchen', energy_model: 'per_event', kwh_per_event: 0.02,
    event_noun: { en: { one: 'espresso', other: 'espressos' }, es: { one: 'espresso', other: 'espressos' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'One espresso ≈ 0.02 kWh: heating ~40 mL of brew water plus boiler losses (physics estimate; range 0.01–0.05 kWh). Pending measured verification.',
    note_es: 'Un espresso ≈ 0,02 kWh: calentar ~40 mL de agua más las pérdidas de la caldera (estimación física; rango 0,01–0,05 kWh). Pendiente de verificación medida.',
    source_ids: ['codata_physics'], value_year: 2026, difficulty: 2,
  }),
  item({
    id: 'toaster', name: { en: 'Toaster', es: 'Tostadora' }, emoji: '🍞',
    category: 'kitchen', energy_model: 'power', power_watts: 1000,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [2, 3, 5],
    note_en: 'Typical 2-slice toaster rated ~1,000 W (product-class range 800–1,500 W). Pending certified-dataset verification.',
    note_es: 'Tostadora típica de 2 rebanadas de ~1.000 W (rango de la clase 800–1.500 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'air_fryer', name: { en: 'Air fryer', es: 'Freidora de aire' }, emoji: '🍟',
    category: 'kitchen', energy_model: 'power', power_watts: 1500,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [10, 15, 20, 30],
    note_en: 'Typical air fryer rated ~1,500 W, element cycling brings averages slightly lower (product-class range 1,200–1,800 W). Pending verification.',
    note_es: 'Freidora de aire típica de ~1.500 W; los ciclos de la resistencia reducen algo el promedio (rango 1.200–1.800 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),

  // ——— Climate & home ———
  item({
    id: 'room_ac', name: { en: 'Air conditioner (room)', es: 'Aire acondicionado (habitación)' }, emoji: '🌬️',
    category: 'climate', energy_model: 'power', power_watts: 800,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified 10–14k BTU room AC draws ~800 W while cooling (n=226, capacity ÷ CEER, ENERGY STAR dataset).',
    note_es: 'El aire acondicionado de habitación certificado mediano de 10–14k BTU consume ~800 W mientras enfría (n=226, capacidad ÷ CEER, base ENERGY STAR).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'space_heater', name: { en: 'Electric space heater', es: 'Calefactor eléctrico' }, emoji: '♨️',
    category: 'climate', energy_model: 'power', power_watts: 1500,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Portable resistance heaters are rated 1,500 W in North America (2,000 W typical in Europe); resistance heating is 100% efficient at the outlet.',
    note_es: 'Los calefactores portátiles de resistencia son de 1.500 W en Norteamérica (2.000 W típico en Europa); la calefacción por resistencia es 100% eficiente en el enchufe.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'heat_pump', name: { en: 'Heat pump (heating)', es: 'Bomba de calor (calefacción)' }, emoji: '♻️',
    category: 'climate', energy_model: 'power', power_watts: 800,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'A heat pump delivering ~2.8 kW of heat at seasonal COP ~3.5 draws ~800 W of electricity — about 0.29 kWh electric per kWh of heat. Pending dataset verification.',
    note_es: 'Una bomba de calor que entrega ~2,8 kW de calor con COP estacional ~3,5 consume ~800 W eléctricos — unos 0,29 kWh eléctricos por kWh de calor. Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 3,
  }),
  item({
    id: 'gas_boiler', name: { en: 'Gas boiler (heating)', es: 'Caldera de gas (calefacción)' }, emoji: '🏠',
    category: 'climate', energy_model: 'power', power_watts: 12000,
    carrier: 'natural_gas', typical_unit: 'hours',
    note_en: 'A home gas boiler actively heating burns ~12 kW of gas (thermal; modulating range 8–24 kW). Country-invariant. Pending dataset verification.',
    note_es: 'Una caldera de gas doméstica en funcionamiento quema ~12 kW de gas (térmico; rango de modulación 8–24 kW). No varía por país. Pendiente de verificación.',
    source_ids: ['doe_energysaver', 'desnz_2025'], value_year: 2026, difficulty: 3,
  }),
  item({
    id: 'ceiling_fan', name: { en: 'Ceiling fan', es: 'Ventilador de techo' }, emoji: '🪭',
    category: 'climate', energy_model: 'power', power_watts: 29.8,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified ceiling fan draws 29.8 W at high speed (n=1,384, ENERGY STAR dataset).',
    note_es: 'El ventilador de techo certificado mediano consume 29,8 W a velocidad alta (n=1.384, base ENERGY STAR).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 1,
  }),
  item({
    id: 'dehumidifier', name: { en: 'Dehumidifier', es: 'Deshumidificador' }, emoji: '💧',
    category: 'climate', energy_model: 'power', power_watts: 313,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified dehumidifier: 343 kWh/yr over the 1,095-hour test basis ≈ 313 W while running (n=523, ENERGY STAR dataset).',
    note_es: 'Deshumidificador certificado mediano: 343 kWh/año sobre la base de prueba de 1.095 horas ≈ 313 W en funcionamiento (n=523, base ENERGY STAR).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'electric_blanket', name: { en: 'Electric blanket', es: 'Manta eléctrica' }, emoji: '🛏️',
    category: 'climate', energy_model: 'power', power_watts: 150,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Typical double electric blanket rated ~150 W on high (product-class range 60–200 W). Pending verification.',
    note_es: 'Manta eléctrica doble típica de ~150 W al máximo (rango de la clase 60–200 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),

  // ——— Personal care & laundry ———
  item({
    id: 'hairdryer', name: { en: 'Hairdryer', es: 'Secador de pelo' }, emoji: '💨',
    category: 'personal', energy_model: 'power', power_watts: 1800,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [5, 10, 15],
    note_en: 'Typical consumer hairdryer on high: ~1,800 W (product-class range 1,200–2,200 W). Pending certified-dataset verification.',
    note_es: 'Secador de pelo típico al máximo: ~1.800 W (rango de la clase 1.200–2.200 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'electric_shower', name: { en: 'Shower (electric water heater)', es: 'Ducha (calentador eléctrico)' }, emoji: '🚿',
    category: 'personal', energy_model: 'power', power_watts: 9500,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [5, 8, 10, 15],
    note_en: 'A shower running on an instantaneous electric water heater draws ~9.5 kW while the water flows (class range 7.5–10.5 kW).',
    note_es: 'Una ducha con calentador eléctrico instantáneo consume ~9,5 kW mientras corre el agua (rango 7,5–10,5 kW).',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 2,
  }),
  item({
    id: 'hair_straightener', name: { en: 'Hair straightener', es: 'Plancha de pelo' }, emoji: '💇',
    category: 'personal', energy_model: 'power', power_watts: 120,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [5, 10, 15],
    note_en: 'Hair straighteners average ~120 W once at temperature (class range 40–300 W). Pending verification.',
    note_es: 'Las planchas de pelo consumen de media ~120 W una vez calientes (rango 40–300 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'electric_toothbrush', name: { en: 'Electric toothbrush', es: 'Cepillo de dientes eléctrico' }, emoji: '🪥',
    category: 'personal', energy_model: 'per_event', kwh_per_event: 0.002,
    event_noun: { en: { one: 'charge', other: 'charges' }, es: { one: 'carga', other: 'cargas' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'One full charge of a ~1.4 Wh toothbrush battery plus charger losses ≈ 0.002 kWh — nearly negligible, which is the point.',
    note_es: 'Una carga completa de una batería de ~1,4 Wh más las pérdidas del cargador ≈ 0,002 kWh — casi despreciable, y esa es la gracia.',
    source_ids: ['codata_physics'], value_year: 2026, difficulty: 3,
  }),
  item({
    id: 'washing_machine', name: { en: 'Washing machine', es: 'Lavadora' }, emoji: '🧺',
    category: 'personal', energy_model: 'per_event', kwh_per_event: 0.47,
    event_noun: { en: { one: 'load', other: 'loads' }, es: { one: 'lavado', other: 'lavados' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'Median certified washer: 110 kWh/yr over the 234-load label basis ≈ 0.47 kWh per warm load (n=393, ENERGY STAR dataset; certified units skew efficient).',
    note_es: 'Lavadora certificada mediana: 110 kWh/año sobre la base de etiqueta de 234 lavados ≈ 0,47 kWh por lavado templado (n=393, base ENERGY STAR; las certificadas son más eficientes que la media).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'tumble_dryer', name: { en: 'Tumble dryer', es: 'Secadora' }, emoji: '🌀',
    category: 'personal', energy_model: 'per_event', kwh_per_event: 2.15,
    event_noun: { en: { one: 'load', other: 'loads' }, es: { one: 'secado', other: 'secados' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'Median certified electric dryer: 608 kWh/yr over the 283-load test basis ≈ 2.15 kWh per load (n=644, ENERGY STAR dataset).',
    note_es: 'Secadora eléctrica certificada mediana: 608 kWh/año sobre la base de prueba de 283 secados ≈ 2,15 kWh por secado (n=644, base ENERGY STAR).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 2,
  }),
  item({
    id: 'iron', name: { en: 'Clothes iron', es: 'Plancha de ropa' }, emoji: '👕',
    category: 'personal', energy_model: 'power', power_watts: 1400,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [10, 15, 20, 30],
    note_en: 'Typical steam iron rated ~1,400 W; thermostat cycling lowers averages (class range 1,000–1,800 W). Pending verification.',
    note_es: 'Plancha de vapor típica de ~1.400 W; el termostato reduce el promedio (rango 1.000–1.800 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'vacuum_cleaner', name: { en: 'Vacuum cleaner', es: 'Aspiradora' }, emoji: '🧹',
    category: 'personal', energy_model: 'power', power_watts: 1200,
    carrier: 'electricity', typical_unit: 'minutes',
    clue_quantities: [10, 15, 30],
    note_en: 'Corded vacuum cleaners draw ~1,200 W (class range 500–1,800 W; EU ecodesign caps at 900 W). Pending verification.',
    note_es: 'Las aspiradoras con cable consumen ~1.200 W (rango 500–1.800 W; el ecodiseño de la UE limita a 900 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),

  // ——— Electronics ———
  item({
    id: 'tv_55', name: { en: '55″ LED TV', es: 'Televisor LED de 55″' }, emoji: '📺',
    category: 'electronics', energy_model: 'power', power_watts: 97.5,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified 53–57″ TV: 97.5 W on-mode per the federal test procedure (n=30, ENERGY STAR dataset).',
    note_es: 'Televisor certificado mediano de 53–57″: 97,5 W encendido según el procedimiento federal de prueba (n=30, base ENERGY STAR).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 1,
  }),
  item({
    id: 'desktop_monitor', name: { en: 'Computer monitor', es: 'Monitor de ordenador' }, emoji: '🖥️',
    category: 'electronics', energy_model: 'power', power_watts: 28.7,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Median certified display draws 28.7 W in on-mode (n=2,789, ENERGY STAR dataset).',
    note_es: 'El monitor certificado mediano consume 28,7 W encendido (n=2.789, base ENERGY STAR).',
    source_ids: ['energystar'], value_year: ES_YEAR, difficulty: 1,
  }),
  item({
    id: 'laptop', name: { en: 'Laptop', es: 'Portátil' }, emoji: '💻',
    category: 'electronics', energy_model: 'power', power_watts: 50,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Typical laptop in active use draws ~50 W (class range 20–100 W depending on load). Pending verification.',
    note_es: 'Un portátil típico en uso activo consume ~50 W (rango 20–100 W según la carga). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'gaming_pc', name: { en: 'Gaming PC', es: 'PC gaming' }, emoji: '🎮',
    category: 'electronics', energy_model: 'power', power_watts: 350,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'A mid-to-high gaming desktop under game load draws ~350 W, monitor excluded (class range 200–600 W). Pending measured verification.',
    note_es: 'Un PC de juegos medio-alto en carga consume ~350 W sin contar el monitor (rango 200–600 W). Pendiente de verificación medida.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 2,
  }),
  item({
    id: 'game_console', name: { en: 'Game console', es: 'Consola de videojuegos' }, emoji: '🕹️',
    category: 'electronics', energy_model: 'power', power_watts: 160,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Current-generation consoles draw ~160 W while gaming (class range 70–220 W). Pending measured verification.',
    note_es: 'Las consolas de la generación actual consumen ~160 W jugando (rango 70–220 W). Pendiente de verificación medida.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'smartphone_charge', name: { en: 'Smartphone (charge)', es: 'Móvil (carga)' }, emoji: '📱',
    category: 'electronics', energy_model: 'per_event', kwh_per_event: 0.015,
    event_noun: { en: { one: 'charge', other: 'charges' }, es: { one: 'carga', other: 'cargas' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'One full charge of a ~13 Wh smartphone battery at ~85% charger efficiency ≈ 0.015 kWh.',
    note_es: 'Una carga completa de una batería de móvil de ~13 Wh con ~85% de eficiencia del cargador ≈ 0,015 kWh.',
    source_ids: ['codata_physics'], value_year: 2026, difficulty: 3,
  }),
  item({
    id: 'tablet_charge', name: { en: 'Tablet (charge)', es: 'Tableta (carga)' }, emoji: '📲',
    category: 'electronics', energy_model: 'per_event', kwh_per_event: 0.033,
    event_noun: { en: { one: 'charge', other: 'charges' }, es: { one: 'carga', other: 'cargas' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'One full charge of a ~28 Wh tablet battery at ~85% charger efficiency ≈ 0.033 kWh.',
    note_es: 'Una carga completa de una batería de tableta de ~28 Wh con ~85% de eficiencia ≈ 0,033 kWh.',
    source_ids: ['codata_physics'], value_year: 2026, difficulty: 3,
  }),
  item({
    id: 'wifi_router', name: { en: 'Wi-Fi router', es: 'Router Wi-Fi' }, emoji: '📶',
    category: 'electronics', energy_model: 'power', power_watts: 8,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Home Wi-Fi routers draw ~8 W continuously (class range 5–20 W). Pending verification.',
    note_es: 'Los routers Wi-Fi domésticos consumen ~8 W de forma continua (rango 5–20 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 2,
  }),
  item({
    id: 'led_bulb', name: { en: '800-lumen LED bulb', es: 'Bombilla LED de 800 lúmenes' }, emoji: '💡',
    category: 'electronics', energy_model: 'power', power_watts: 9,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'An 800-lumen LED (the light of a classic 60 W incandescent) draws ~9 W (DOE Energy Saver lighting guidance, range 8–10 W).',
    note_es: 'Una LED de 800 lúmenes (la luz de una incandescente clásica de 60 W) consume ~9 W (guía de DOE Energy Saver, rango 8–10 W).',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'led_bulb_1600', name: { en: '1600-lumen LED bulb', es: 'Bombilla LED de 1600 lúmenes' }, emoji: '🔆',
    category: 'electronics', energy_model: 'power', power_watts: 16,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'A bright 1600-lumen LED (100 W-equivalent class) draws ~16 W (DOE Energy Saver lighting guidance, range 14–20 W).',
    note_es: 'Una LED brillante de 1600 lúmenes (clase equivalente a 100 W) consume ~16 W (guía de DOE Energy Saver, rango 14–20 W).',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'incandescent_bulb', name: { en: '800-lumen incandescent bulb', es: 'Bombilla incandescente de 800 lúmenes' }, emoji: '🔦',
    category: 'electronics', energy_model: 'power', power_watts: 60,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'The classic 60 W incandescent bulb produces ~800 lumens — same light as a 9 W LED, using 6–7× the energy.',
    note_es: 'La clásica incandescente de 60 W produce ~800 lúmenes — la misma luz que una LED de 9 W, usando 6–7× la energía.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'incandescent_bulb_1600', name: { en: '1600-lumen incandescent bulb', es: 'Bombilla incandescente de 1600 lúmenes' }, emoji: '🌟',
    category: 'electronics', energy_model: 'power', power_watts: 100,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'A 100 W incandescent bulb produces ~1600 lumens — same light as a 16 W LED.',
    note_es: 'Una incandescente de 100 W produce ~1600 lúmenes — la misma luz que una LED de 16 W.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 1,
  }),
  item({
    id: 'smart_speaker', name: { en: 'Smart speaker', es: 'Altavoz inteligente' }, emoji: '🔊',
    category: 'electronics', energy_model: 'power', power_watts: 3,
    carrier: 'electricity', typical_unit: 'hours',
    note_en: 'Smart speakers idle/play at ~3 W (class range 1.5–6 W). Pending measured verification.',
    note_es: 'Los altavoces inteligentes consumen ~3 W en reposo/reproducción (rango 1,5–6 W). Pendiente de verificación.',
    source_ids: ['doe_energysaver'], value_year: 2026, difficulty: 2,
  }),
  item({
    id: 'ereader_charge', name: { en: 'E-reader (charge)', es: 'Lector de libros electrónicos (carga)' }, emoji: '📚',
    category: 'electronics', energy_model: 'per_event', kwh_per_event: 0.006,
    event_noun: { en: { one: 'charge', other: 'charges' }, es: { one: 'carga', other: 'cargas' } },
    carrier: 'electricity', typical_unit: 'events',
    note_en: 'One full charge of a ~5 Wh e-reader battery at ~85% charger efficiency ≈ 0.006 kWh — weeks of reading.',
    note_es: 'Una carga completa de una batería de e-reader de ~5 Wh con ~85% de eficiencia ≈ 0,006 kWh — semanas de lectura.',
    source_ids: ['codata_physics'], value_year: 2026, difficulty: 3,
  }),

  // ——— Transport ———
  item({
    id: 'petrol_car', name: { en: 'Petrol car', es: 'Coche de gasolina' }, emoji: '🚗',
    category: 'transport', energy_model: 'per_km', uses_country_car_default: true,
    carrier: 'petrol', typical_unit: 'km',
    note_en: 'Uses your country’s average on-road car CO₂ per km where verified (see conversion table); global fallback 160 g/km ≈ the UK on-road average petrol car (DESNZ 2025).',
    note_es: 'Usa el promedio de CO₂ por km de los coches de tu país cuando está verificado (ver tabla de conversión); reserva global de 160 g/km ≈ el coche de gasolina promedio en carretera del Reino Unido (DESNZ 2025).',
    source_ids: ['desnz_2025', 'epa_trends'], value_year: 2025, difficulty: 2,
  }),
  item({
    id: 'diesel_car', name: { en: 'Diesel car', es: 'Coche diésel' }, emoji: '🚙',
    category: 'transport', energy_model: 'per_km', gco2_per_km: 171.36,
    carrier: 'diesel', typical_unit: 'km',
    note_en: 'Average on-road diesel car: 171.4 gCO₂/km (DESNZ 2025, CO₂ only, UK fleet — used as the representative value everywhere).',
    note_es: 'Coche diésel promedio en carretera: 171,4 gCO₂/km (DESNZ 2025, solo CO₂, parque del Reino Unido — usado como valor representativo).',
    source_ids: ['desnz_2025'], value_year: 2025, difficulty: 2,
  }),
  item({
    id: 'ev_car', name: { en: 'Electric car', es: 'Coche eléctrico' }, emoji: '🔌',
    category: 'transport', energy_model: 'per_km', kwh_per_km: 0.178,
    carrier: 'electricity', typical_unit: 'km',
    note_en: 'EPA combined rating of the best-selling EV (2024 Tesla Model Y LR AWD): 28.7 kWh/100 mi wall-to-wheels ≈ 0.178 kWh/km, charging losses included.',
    note_es: 'Calificación combinada de la EPA del eléctrico más vendido (Tesla Model Y LR AWD 2024): 28,7 kWh/100 mi de enchufe a rueda ≈ 0,178 kWh/km, con pérdidas de carga.',
    source_ids: ['epa_fueleconomy'], value_year: 2024, difficulty: 2,
  }),
  item({
    id: 'motor_scooter', name: { en: 'Motor scooter', es: 'Moto/scooter' }, emoji: '🛵',
    category: 'transport', energy_model: 'per_km', gco2_per_km: 80.94,
    carrier: 'petrol', typical_unit: 'km',
    note_en: 'Small motorbike (≤125 cc): 80.9 gCO₂/km (DESNZ 2025, CO₂ only).',
    note_es: 'Motocicleta pequeña (≤125 cc): 80,9 gCO₂/km (DESNZ 2025, solo CO₂).',
    source_ids: ['desnz_2025'], value_year: 2025, difficulty: 2,
  }),
  item({
    id: 'city_bus', name: { en: 'City bus (per passenger)', es: 'Autobús urbano (por pasajero)' }, emoji: '🚌',
    category: 'transport', energy_model: 'per_km', per_passenger: true, gco2_per_km: 103.11,
    carrier: 'diesel', typical_unit: 'km',
    note_en: 'Average local bus carrying its average load of ~12.7 passengers: 103.1 gCO₂ per passenger-km, CO₂ only (DESNZ 2025 / DfT bus statistics). A fuller bus emits less per person.',
    note_es: 'Autobús urbano medio con su ocupación media de ~12,7 pasajeros: 103,1 gCO₂ por pasajero-km, solo CO₂ (DESNZ 2025 / estadísticas DfT). Un autobús más lleno emite menos por persona.',
    source_ids: ['desnz_2025'], value_year: 2025, difficulty: 2,
  }),
  item({
    id: 'coach', name: { en: 'Intercity bus (per passenger)', es: 'Autobús interurbano (por pasajero)' }, emoji: '🚍',
    category: 'transport', energy_model: 'per_km', per_passenger: true, gco2_per_km: 27.27,
    carrier: 'diesel', typical_unit: 'km',
    note_en: 'Intercity bus carrying its average load of ~17.6 passengers: 27.3 gCO₂ per passenger-km, CO₂ only (DESNZ 2025) — among the cleanest motorized travel.',
    note_es: 'Autobús interurbano con su ocupación media de ~17,6 pasajeros: 27,3 gCO₂ por pasajero-km, solo CO₂ (DESNZ 2025) — de los viajes motorizados más limpios.',
    source_ids: ['desnz_2025'], value_year: 2025, difficulty: 3,
  }),
  item({
    id: 'train_national', name: { en: 'Train (per passenger)', es: 'Tren (por pasajero)' }, emoji: '🚆',
    category: 'transport', energy_model: 'per_km', per_passenger: true, gco2_per_km: 35.1,
    carrier: 'diesel', typical_unit: 'km',
    note_en: 'National rail average: 35.1 gCO₂ per passenger-km, CO₂ only — the whole network’s energy (electric + diesel trains) divided by all passenger-km at typical ridership (DESNZ 2025; fully electrified networks differ).',
    note_es: 'Promedio de tren nacional: 35,1 gCO₂ por pasajero-km, solo CO₂ — toda la energía de la red (trenes eléctricos y diésel) dividida por todos los pasajeros-km con ocupación típica (DESNZ 2025; las redes totalmente electrificadas difieren).',
    source_ids: ['desnz_2025'], value_year: 2025, difficulty: 3,
  }),
  item({
    id: 'flight_short_haul', name: { en: 'Flight, short-haul (per passenger)', es: 'Vuelo de corta distancia (por pasajero)' }, emoji: '✈️',
    category: 'transport', energy_model: 'per_km', per_passenger: true, gco2_per_km: 73.44,
    carrier: 'petrol', typical_unit: 'km',
    note_en: 'Short-haul economy flight with ~83% of seats filled (fleet average, CAA 2023): 73.4 gCO₂ per passenger-km, CO₂ only, excluding radiative forcing (DESNZ 2025; with RF the climate impact roughly doubles).',
    note_es: 'Vuelo económico de corta distancia con ~83% de los asientos ocupados (promedio de flota, CAA 2023): 73,4 gCO₂ por pasajero-km, solo CO₂, sin forzamiento radiativo (DESNZ 2025; con FR el impacto climático casi se duplica).',
    source_ids: ['desnz_2025'], value_year: 2025, difficulty: 3,
  }),
  item({
    id: 'e_bike', name: { en: 'E-bike', es: 'Bicicleta eléctrica' }, emoji: '🚲',
    category: 'transport', energy_model: 'per_km', kwh_per_km: 0.011,
    carrier: 'electricity', typical_unit: 'km',
    note_en: 'A ~0.5 kWh e-bike battery delivers ~45 km of assisted riding ≈ 0.011 kWh/km including charging losses. Pending measured verification.',
    note_es: 'Una batería de e-bike de ~0,5 kWh da ~45 km asistidos ≈ 0,011 kWh/km con pérdidas de carga. Pendiente de verificación medida.',
    source_ids: ['codata_physics'], value_year: 2026, difficulty: 3,
  }),
];

const OUT = join(process.cwd(), 'data', 'items.json');
writeFileSync(OUT, JSON.stringify(items, null, 2) + '\n');
console.log(`wrote ${items.length} items to ${OUT}`);
