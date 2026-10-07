import { describe, expect, it } from 'vitest';
import { getCountry, loadCountryFactors, loadItems } from '@/lib/data';
import { computeCO2 } from '@/lib/emissions';
import { countryName, countryOptions } from '@/lib/country-names';
import { clueLabel, clueTitle, formatCO2, formatQty, unitClueTitle } from '@/lib/format';
import { rawString, resolveLang, STRING_KEYS, t } from '@/lib/i18n';
import { numberMismatches, placeholderMismatches } from '@/lib/i18n-check';
import { suggestCountry } from '@/lib/geo';
import { generateSourcesMd } from '@/lib/sources-md';
import { LANGS, type Item } from '@/lib/types';

const items = loadItems();
const get = (id: string): Item => items.find((i) => i.id === id)!;

describe('string catalog', () => {
  /** Keys whose translation legitimately equals the English (cognates, symbols). */
  const SAME_AS_EN: Record<string, string[]> = {
    fr: ['axis_points', 'sm_col_sources', 'about_grid_source'],
    de: ['sm_col_sources'],
  };

  it('every key is non-empty in every language and actually translated', () => {
    for (const key of STRING_KEYS) {
      const s = rawString(key);
      for (const lang of LANGS) {
        expect(s[lang].trim(), `${key}.${lang}`).not.toBe('');
        if (lang !== 'en' && s[lang] === s.en && !SAME_AS_EN[lang]?.includes(key)) {
          throw new Error(`${key}.${lang} is identical to English: "${s.en}"`);
        }
      }
    }
  });

  it('every translation keeps the English placeholders and numbers', () => {
    for (const key of STRING_KEYS) {
      expect(placeholderMismatches(rawString(key)), key).toEqual([]);
      expect(numberMismatches(rawString(key)), key).toEqual([]);
    }
  });

  it('every item note keeps the English numbers in all languages', () => {
    for (const item of items) expect(numberMismatches(item.assumption_note), item.id).toEqual([]);
  });

  it('French elides de/que before a vowel', () => {
    expect(clueLabel(10, get('vacuum_cleaner'), 'fr')).toBe('10 min d’aspirateur');
    expect(t('conversion_context', 'fr', { clue: 'X', item: 'aspirateur' })).toContain('d’X en aspirateur'.replace('d’X', 'de X'));
    expect(t('emissions_context', 'fr', { clue: 'X' })).toMatch(/^Émissions de X/);
  });
});

describe('quantities in every language', () => {
  it('uses each language’s plural forms', () => {
    expect(formatQty(24, 'hours', 'en')).toBe('24 h'); // under 48 h stays in hours
    expect(formatQty(72, 'hours', 'en')).toBe('3 days');
    expect(formatQty(48, 'hours', 'ru')).toBe('2 дня');
    expect(formatQty(5 * 24, 'hours', 'ru')).toBe('5 дней');
    expect(formatQty(21 * 24, 'hours', 'ru')).toBe('21 день');
    expect(formatQty(2.5 * 24, 'hours', 'ru')).toBe('2,5 дня');
    const wash = get('washing_machine');
    expect(formatQty(1, 'events', 'en', wash.event_noun)).toBe('1 load');
    expect(formatQty(3, 'events', 'en', wash.event_noun)).toBe('3 loads');
    expect(formatQty(5, 'events', 'ru', wash.event_noun)).toBe('5 стирок');
    expect(formatQty(3, 'events', 'zh', wash.event_noun)).toBe('3 次');
  });

  it('localizes decimal marks and unit symbols', () => {
    expect(formatQty(0.5, 'hours', 'de')).toBe('30 Min.');
    expect(formatQty(2.5, 'hours', 'fr')).toBe('2,5 h');
    expect(formatQty(10, 'minutes', 'zh')).toBe('10 分钟');
    expect(formatQty(240, 'km', 'ru')).toBe('240 км');
    expect(formatCO2(1234, 'de')).toBe('1,2 kg CO₂');
    expect(formatCO2(41, 'ru')).toBe('41 г CO₂');
  });

  it('reads naturally as a clue in each language', () => {
    const hd = get('hairdryer');
    expect(clueTitle(10, hd, 'en')).toBe('10 min of hairdryer');
    expect(clueTitle(10, hd, 'es')).toBe('10 min de secador de pelo');
    expect(clueTitle(10, hd, 'fr')).toBe('10 min de sèche-cheveux');
    expect(clueTitle(10, hd, 'de')).toBe('10 Min. Haartrockner');
    expect(clueTitle(10, hd, 'ru')).toBe('Фен: 10 мин');
    expect(clueTitle(10, hd, 'zh')).toBe('吹风机 10 分钟');
    // "Worth remembering" keeps the item's own unit instead of rescaling
    expect(unitClueTitle(get('hairdryer'), 'en')).toBe('1 min of hairdryer');
    expect(unitClueTitle(get('refrigerator'), 'de')).toBe('1 Std. Kühlschrank');
    expect(unitClueTitle(get('vacuum_cleaner'), 'ru')).toBe('Пылесос: 1 мин');
    // the charge items no longer read "3 charges of smartphone charge"
    expect(clueLabel(3, get('smartphone_charge'), 'en')).toBe('3 charges of smartphone');
  });
});

describe('breakdown steps', () => {
  it('have a label and formula in every language, with no language leaking into another', () => {
    const pol = getCountry('POL');
    for (const item of items) {
      for (const step of computeCO2(item, 2, pol).steps) {
        for (const lang of LANGS) {
          expect(step.label[lang], `${item.id} ${lang}`).toBeTruthy();
          expect(step.math[lang], `${item.id} ${lang}`).toBeTruthy();
        }
        expect(step.math.en).not.toMatch(/térmico|кВт|Вт/);
      }
    }
  });

  it('name the country in the reader’s language', () => {
    const step = computeCO2(get('hairdryer'), 10, getCountry('DEU')).steps.find((s) => s.label.en.startsWith('Grid'))!;
    expect(step.label.fr).toContain('Allemagne');
    expect(step.label.ru).toContain('Германия');
    expect(step.label.zh).toContain('德国');
  });

  it('say per passenger-km only for shared vehicles', () => {
    const fra = getCountry('FRA');
    const label = (id: string) => computeCO2(get(id), 10, fra).steps[0].label.en;
    expect(label('city_bus')).toMatch(/passenger/);
    expect(label('diesel_car')).not.toMatch(/passenger/);
    expect(label('motor_scooter')).not.toMatch(/passenger/);
  });
});

describe('countries', () => {
  it('every country is named in every language', () => {
    for (const cf of loadCountryFactors()) {
      for (const lang of LANGS) expect(countryName(cf.iso3, lang), `${cf.iso3}.${lang}`).toBeTruthy();
    }
  });

  it('menus are alphabetized in the reader’s language', () => {
    const en = countryOptions(loadCountryFactors(), 'en').map((c) => c.name);
    expect(en.indexOf('Afghanistan')).toBeLessThan(en.indexOf('Aruba'));
    const de = countryOptions(loadCountryFactors(), 'de').map((c) => c.name);
    expect(de.indexOf('Deutschland')).toBeLessThan(de.indexOf('Frankreich'));
  });
});

describe('language and country detection', () => {
  it('prefers ?lang=, then Accept-Language by q-value, then English', () => {
    expect(resolveLang('ru', 'fr-FR')).toBe('ru');
    expect(resolveLang(null, 'fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(resolveLang(null, 'ja,zh-CN;q=0.9')).toBe('zh');
    expect(resolveLang(null, 'en;q=0.5,de;q=0.9')).toBe('de');
    expect(resolveLang('xx', 'ja')).toBe('en');
    expect(resolveLang(null, null)).toBe('en');
  });

  it('suggests a country from a region or, failing that, the language', () => {
    const known = loadCountryFactors();
    expect(suggestCountry('en-US,en;q=0.9', known)).toBe('USA');
    expect(suggestCountry('ru', known)).toBe('RUS');
    expect(suggestCountry('zh-Hans-CN', known)).toBe('CHN');
    expect(suggestCountry('de', known)).toBe('DEU');
    expect(suggestCountry('pt-br', known)).toBe('BRA');
  });
});

describe('technical appendix', () => {
  it('renders in every language without leftover placeholders', () => {
    for (const lang of LANGS) {
      const md = generateSourcesMd(lang);
      expect(md).not.toMatch(/\{[a-z_]+\}/);
      expect(md).toContain(t('sm_scope_title', lang));
    }
  });
});
