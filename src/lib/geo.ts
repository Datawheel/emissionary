/** Map an Accept-Language region hint (e.g. "fr-FR") to a known ISO3 (spec §5). */
const ISO2_TO_ISO3: Record<string, string> = {
  FR: 'FRA', DE: 'DEU', PL: 'POL', NO: 'NOR', US: 'USA', CN: 'CHN', IN: 'IND', BR: 'BRA',
  GB: 'GBR', ES: 'ESP', IT: 'ITA', NL: 'NLD', SE: 'SWE', JP: 'JPN', AU: 'AUS', CA: 'CAN',
  MX: 'MEX', KR: 'KOR', ZA: 'ZAF', TR: 'TUR', AR: 'ARG', CL: 'CHL', CO: 'COL', PT: 'PRT',
  BE: 'BEL', CH: 'CHE', AT: 'AUT', DK: 'DNK', FI: 'FIN', IE: 'IRL', GR: 'GRC', CZ: 'CZE',
  HU: 'HUN', RO: 'ROU', UA: 'UKR', ID: 'IDN', TH: 'THA', VN: 'VNM', PH: 'PHL', MY: 'MYS',
  SG: 'SGP', NZ: 'NZL', IL: 'ISR', SA: 'SAU', AE: 'ARE', EG: 'EGY', NG: 'NGA', KE: 'KEN',
  PE: 'PER', VE: 'VEN', EC: 'ECU', UY: 'URY', BO: 'BOL', PY: 'PRY', CR: 'CRI', PA: 'PAN',
};

export function suggestCountry(acceptLanguage: string | null, known: { iso3: string }[]): string {
  const m = acceptLanguage?.match(/[a-z]{2}-([A-Z]{2})/);
  if (m) {
    const iso3 = ISO2_TO_ISO3[m[1]];
    if (iso3 && known.some((f) => f.iso3 === iso3)) return iso3;
  }
  return 'FRA';
}
