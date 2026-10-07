/**
 * Generates data/country_names.json — each country's name in every supported
 * language. English keeps the Ember/OWID name already used in
 * country_factors.json; the other languages come from the Unicode CLDR via
 * Intl.DisplayNames (the standard localized country names).
 *
 * Run after scripts/update-country-factors.ts adds countries:
 *   npx tsx scripts/build-country-names.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import countries from 'i18n-iso-countries';
import { LANGS, type CountryFactors, type Localized } from '../src/lib/types';

const factors = JSON.parse(readFileSync(join(process.cwd(), 'data', 'country_factors.json'), 'utf8')) as CountryFactors[];
const display = Object.fromEntries(
  LANGS.map((lang) => [lang, new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : lang], { type: 'region' })]),
);

/**
 * Reviewed overrides where CLDR's default form is awkward in running text or
 * disagrees with the English (Ember/OWID) name the game already uses.
 */
const OVERRIDES: Record<string, Partial<Localized>> = {
  COD: {
    fr: 'République démocratique du Congo',
    de: 'Demokratische Republik Kongo',
    ru: 'Демократическая Республика Конго',
    zh: '刚果民主共和国',
  },
  COG: { fr: 'Congo', de: 'Kongo', ru: 'Республика Конго', zh: '刚果共和国' },
  HKG: { es: 'Hong Kong', fr: 'Hong Kong', de: 'Hongkong', ru: 'Гонконг', zh: '香港' },
  MAC: { es: 'Macao', fr: 'Macao', de: 'Macau', ru: 'Макао', zh: '澳门' },
  MMR: { es: 'Myanmar', fr: 'Myanmar', ru: 'Мьянма' },
  PSE: { es: 'Palestina', fr: 'Palestine', de: 'Palästina', ru: 'Палестина', zh: '巴勒斯坦' },
  USA: { ru: 'США' },
  VGB: { ru: 'Британские Виргинские острова' },
  VIR: { ru: 'Американские Виргинские острова' },
};

const out: Record<string, Localized> = {};
const missing: string[] = [];
for (const cf of [...factors].sort((a, b) => a.iso3.localeCompare(b.iso3))) {
  const iso2 = countries.alpha3ToAlpha2(cf.iso3);
  const names = {} as Localized;
  for (const lang of LANGS) {
    const cldr = iso2 ? display[lang].of(iso2) : undefined;
    if (lang !== 'en' && (!cldr || cldr === iso2)) missing.push(`${cf.iso3}/${lang}`);
    names[lang] = lang === 'en' ? cf.name : (cldr && cldr !== iso2 ? cldr : cf.name);
  }
  out[cf.iso3] = { ...names, ...OVERRIDES[cf.iso3] };
}
if (missing.length) {
  console.error(`no CLDR name for: ${missing.join(', ')}`);
  process.exit(1);
}
const path = join(process.cwd(), 'data', 'country_names.json');
writeFileSync(path, JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${Object.keys(out).length} countries to ${path}`);
