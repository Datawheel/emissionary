import { headers } from 'next/headers';
import AppHeader from '@/components/AppHeader';
import GameClient from '@/components/GameClient';
import { loadCountryFactors } from '@/lib/data';
import { countryOptions } from '@/lib/country-names';
import { currentPlayer } from '@/lib/player';
import { requestLang } from '@/lib/request-lang';
import { suggestCountry } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function PlayPage() {
  const lang = await requestLang();
  const factors = loadCountryFactors();
  const player = await currentPlayer();
  const accept = (await headers()).get('accept-language');
  return (
    <>
      <AppHeader lang={lang} />
      <GameClient
        countries={countryOptions(factors, lang)}
        suggested={suggestCountry(accept, factors)}
        hasPlayer={player != null}
        playerCountry={player?.country ?? null}
        lang={lang}
      />
    </>
  );
}
