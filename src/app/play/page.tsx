import { headers } from 'next/headers';
import AppHeader from '@/components/AppHeader';
import GameClient from '@/components/GameClient';
import { loadCountryFactors } from '@/lib/data';
import { currentPlayer } from '@/lib/player';
import { pickLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** Map an Accept-Language region hint (e.g. "fr-FR") to an ISO3 we know. */
function suggestCountry(acceptLanguage: string | null, factors: { iso3: string }[]): string {
  const m = acceptLanguage?.match(/[a-z]{2}-([A-Z]{2})/);
  if (m) {
    const iso2 = m[1];
    // cheap iso2→iso3 via flag correspondence: compare first letters is unsafe;
    // use a small common map and fall back to France.
    const map: Record<string, string> = {
      FR: 'FRA', DE: 'DEU', PL: 'POL', NO: 'NOR', US: 'USA', CN: 'CHN', IN: 'IND', BR: 'BRA',
      GB: 'GBR', ES: 'ESP', IT: 'ITA', NL: 'NLD', SE: 'SWE', JP: 'JPN', AU: 'AUS', CA: 'CAN',
      MX: 'MEX', KR: 'KOR', ZA: 'ZAF', TR: 'TUR', AR: 'ARG', CL: 'CHL', CO: 'COL', PT: 'PRT',
      BE: 'BEL', CH: 'CHE', AT: 'AUT', DK: 'DNK', FI: 'FIN', IE: 'IRL', GR: 'GRC', CZ: 'CZE',
    };
    const iso3 = map[iso2];
    if (iso3 && factors.some((f) => f.iso3 === iso3)) return iso3;
  }
  return 'FRA';
}

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  const factors = loadCountryFactors();
  const player = await currentPlayer();
  const accept = (await headers()).get('accept-language');
  return (
    <>
      <AppHeader lang={lang} />
      <GameClient
        countries={factors.map((c) => ({ iso3: c.iso3, name: c.name, flag: c.flag }))}
        suggested={suggestCountry(accept, factors)}
        hasPlayer={player != null}
        playerCountry={player?.country ?? null}
        lang={lang}
      />
    </>
  );
}
