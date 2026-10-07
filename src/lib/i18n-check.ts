/**
 * Mechanical translation checks shared by `npm run validate` and the tests:
 * translations must carry the same numbers and the same {placeholders} as the
 * English source. They catch dropped, altered or mistyped values — meaning is
 * reviewed by people, numbers by machine.
 */
import { LANGS, type Lang, type Localized } from './types';

const GROUP: Record<Lang, string> = { en: ',', zh: ',', es: '\\.', de: '\\.', fr: '[  ]', ru: '[  ]' };
const DECIMAL: Record<Lang, string> = { en: '\\.', zh: '\\.', es: ',', de: ',', fr: ',', ru: ',' };

/** The set of numeric values written in a text, normalized from the language's own conventions. */
export function numbersIn(text: string, lang: Lang): string[] {
  text = text.replace(PLACEHOLDER, ''); // {co2} is a name, not a number
  const re = new RegExp(`\\d+(?:${GROUP[lang]}\\d{3})*(?:${DECIMAL[lang]}\\d+)?`, 'g');
  const values = (text.match(re) ?? []).map((m) =>
    String(Number(m.replace(new RegExp(GROUP[lang], 'g'), '').replace(new RegExp(DECIMAL[lang]), '.'))),
  );
  return [...new Set(values)].sort();
}

/** Problems with a localized text versus its English source (empty = consistent). */
export function numberMismatches(text: Localized): string[] {
  const en = numbersIn(text.en, 'en').join(' ');
  return LANGS.filter((l) => l !== 'en')
    .map((l) => ({ l, got: numbersIn(text[l], l).join(' ') }))
    .filter(({ got }) => got !== en)
    .map(({ l, got }) => `${l}: numbers [${got}] ≠ en [${en}]`);
}

const PLACEHOLDER = /\{[a-z][a-z0-9_]*\}/g;

export function placeholdersIn(s: string): string[] {
  return [...new Set(s.match(PLACEHOLDER) ?? [])].sort();
}

/** Every English placeholder must appear in each language; {times} is the only extra allowed (Russian ratios). */
export function placeholderMismatches(text: Localized): string[] {
  const en = placeholdersIn(text.en);
  return LANGS.filter((l) => l !== 'en').flatMap((l) => {
    const got = placeholdersIn(text[l]).filter((p) => p !== '{times}');
    return got.join() === en.join() ? [] : [`${l}: placeholders [${got}] ≠ en [${en}]`];
  });
}
