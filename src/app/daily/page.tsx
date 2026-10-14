import { headers } from 'next/headers';
import AppHeader from '@/components/AppHeader';
import DailyClient from '@/components/DailyClient';
import { loadCountryFactors } from '@/lib/data';
import { countryOptions } from '@/lib/country-names';
import { currentPlayer } from '@/lib/player';
import { embedSearch } from '@/lib/embed';
import { requestEmbed } from '@/lib/request-embed';
import { requestLang } from '@/lib/request-lang';
import { suggestCountry } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function DailyPage() {
  const lang = await requestLang();
  const embed = await requestEmbed();
  const factors = loadCountryFactors();
  const player = await currentPlayer();
  const accept = (await headers()).get('accept-language');
  return (
    <>
      <AppHeader lang={lang} />
      <DailyClient
        countries={countryOptions(factors, lang)}
        suggested={suggestCountry(accept, factors)}
        hasPlayer={player != null}
        playerCountry={player?.country ?? null}
        lang={lang}
        consent={embed.consent}
        qs={embedSearch(lang, embed.theme, embed.consent)}
      />
    </>
  );
}
