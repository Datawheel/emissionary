/**
 * Regenerates data/country_factors.json from Ember's yearly electricity data
 * (fetched via Our World in Data's grapher mirror, which republishes Ember
 * under CC BY 4.0 with stable ISO3 codes).
 *
 * Grid intensity fields are overwritten from the fetched dataset; car fields
 * are preserved from the existing file when present (they are researched
 * separately from EEA/ICCT/EPA), otherwise set to the global fallback.
 *
 * Usage: npx tsx scripts/update-country-factors.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import countries from 'i18n-iso-countries';
import type { CountryFactors } from '../src/lib/types';

const CSV_URL = 'https://ourworldindata.org/grapher/carbon-intensity-electricity.csv?useColumnShortNames=true';
const OUT_PATH = join(process.cwd(), 'data', 'country_factors.json');

export const CAR_FALLBACK_GCO2_KM = 160;
/** Countries whose latest grid data is older than this are dropped. */
const MIN_GRID_YEAR = 2020;
const CAR_FALLBACK_SOURCE = 'desnz_2025'; // 160 g/km ≈ UK on-road average petrol car
const CAR_FALLBACK_YEAR = 2025;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function flagEmoji(iso2: string): string {
  return [...iso2.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('');
}

async function main() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${CSV_URL}`);
  const text = await res.text();
  const lines = text.trim().split('\n');
  const header = parseCsvLine(lines[0]);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`missing column ${name}; got ${header.join(',')}`);
    return i;
  };
  const iEntity = col('entity');
  const iCode = col('code');
  const iYear = col('year');
  const iValue = col('co2_intensity__gco2_kwh');

  // latest year per ISO3 country
  const latest = new Map<string, { name: string; year: number; value: number }>();
  for (const line of lines.slice(1)) {
    const f = parseCsvLine(line);
    const code = f[iCode];
    if (!/^[A-Z]{3}$/.test(code)) continue; // skip aggregates and OWID_* pseudo-codes
    const year = Number(f[iYear]);
    const value = Number(f[iValue]);
    if (!Number.isFinite(year) || !Number.isFinite(value) || value <= 0) continue;
    const prev = latest.get(code);
    if (!prev || year > prev.year) latest.set(code, { name: f[iEntity], year, value });
  }

  const existing: Map<string, CountryFactors> = new Map();
  if (existsSync(OUT_PATH)) {
    for (const row of JSON.parse(readFileSync(OUT_PATH, 'utf8')) as CountryFactors[]) {
      existing.set(row.iso3, row);
    }
  }

  const rows: CountryFactors[] = [];
  let skipped = 0;
  for (const [iso3, { name, year, value }] of latest) {
    if (year < MIN_GRID_YEAR) { skipped++; continue; }
    const iso2 = countries.alpha3ToAlpha2(iso3);
    if (!iso2) { skipped++; continue; }
    const prev = existing.get(iso3);
    rows.push({
      iso3,
      name,
      flag: flagEmoji(iso2),
      grid_gco2_kwh: Math.round(value * 100) / 100,
      grid_year: year,
      grid_source_id: 'ember_yearly',
      car_gco2_km: prev?.car_gco2_km ?? CAR_FALLBACK_GCO2_KM,
      car_year: prev?.car_year ?? CAR_FALLBACK_YEAR,
      car_source_id: prev?.car_source_id ?? CAR_FALLBACK_SOURCE,
      car_is_fallback: prev?.car_is_fallback ?? true,
    });
  }
  rows.sort((a, b) => a.iso3.localeCompare(b.iso3));
  writeFileSync(OUT_PATH, JSON.stringify(rows, null, 2) + '\n');
  console.log(`wrote ${rows.length} countries (skipped ${skipped} unmapped codes) to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
