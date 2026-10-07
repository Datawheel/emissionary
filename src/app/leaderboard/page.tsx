import AppHeader from '@/components/AppHeader';
import LeaderboardClient from '@/components/LeaderboardClient';
import { loadCountryFactors } from '@/lib/data';
import { countryOptions } from '@/lib/country-names';
import { currentPlayer } from '@/lib/player';
import { requestLang } from '@/lib/request-lang';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const lang = await requestLang();
  const player = await currentPlayer();
  return (
    <>
      <AppHeader lang={lang} />
      <LeaderboardClient
        countries={countryOptions(loadCountryFactors(), lang)}
        lang={lang}
        canClaimName={player != null && player.name == null}
      />
    </>
  );
}
