/** Map an Accept-Language region hint (e.g. "fr-FR") to a known ISO3 (spec §5). */
const ISO2_TO_ISO3: Record<string, string> = {
  FR: 'FRA', DE: 'DEU', PL: 'POL', NO: 'NOR', US: 'USA', CN: 'CHN', IN: 'IND', BR: 'BRA',
  GB: 'GBR', ES: 'ESP', IT: 'ITA', NL: 'NLD', SE: 'SWE', JP: 'JPN', AU: 'AUS', CA: 'CAN',
  MX: 'MEX', KR: 'KOR', ZA: 'ZAF', TR: 'TUR', AR: 'ARG', CL: 'CHL', CO: 'COL', PT: 'PRT',
  BE: 'BEL', CH: 'CHE', AT: 'AUT', DK: 'DNK', FI: 'FIN', IE: 'IRL', GR: 'GRC', CZ: 'CZE',
  HU: 'HUN', RO: 'ROU', UA: 'UKR', ID: 'IDN', TH: 'THA', VN: 'VNM', PH: 'PHL', MY: 'MYS',
  SG: 'SGP', NZ: 'NZL', IL: 'ISR', SA: 'SAU', AE: 'ARE', EG: 'EGY', NG: 'NGA', KE: 'KEN',
  PE: 'PER', VE: 'VEN', EC: 'ECU', UY: 'URY', BO: 'BOL', PY: 'PRY', CR: 'CRI', PA: 'PAN',
  RU: 'RUS', KZ: 'KAZ', BY: 'BLR', TW: 'TWN', HK: 'HKG', LU: 'LUX',
};

/** When the browser sends a bare language ("ru", "zh"), suggest its largest country. */
const LANG_TO_ISO3: Record<string, string> = { fr: 'FRA', de: 'DEU', es: 'ESP', ru: 'RUS', zh: 'CHN' };

export function suggestCountry(acceptLanguage: string | null, known: { iso3: string }[]): string {
  const isKnown = (iso3: string | undefined): iso3 is string => !!iso3 && known.some((f) => f.iso3 === iso3);
  const tags = (acceptLanguage ?? '').split(',').map((t) => t.split(';')[0].trim());
  for (const tag of tags) {
    const region = tag.match(/^[a-z]{2,3}-(?:[a-z]{4}-)?([a-z]{2})$/i)?.[1]?.toUpperCase();
    if (region && isKnown(ISO2_TO_ISO3[region])) return ISO2_TO_ISO3[region];
  }
  const primary = tags[0]?.split('-')[0].toLowerCase();
  const byLang = primary ? LANG_TO_ISO3[primary] : undefined;
  return isKnown(byLang) ? byLang : 'FRA';
}
