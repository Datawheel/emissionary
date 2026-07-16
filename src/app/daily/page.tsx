import { headers } from 'next/headers';
import AppHeader from '@/components/AppHeader';
import DailyClient from '@/components/DailyClient';
import { loadCountryFactors } from '@/lib/data';
import { currentPlayer } from '@/lib/player';
import { pickLang } from '@/lib/i18n';
import { suggestCountry } from '@/lib/geo';

export const dynamic = 'force-dynamic';

export default async function DailyPage({
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
      <DailyClient
        countries={factors.map((c) => ({ iso3: c.iso3, name: c.name, flag: c.flag }))}
        suggested={suggestCountry(accept, factors)}
        hasPlayer={player != null}
        playerCountry={player?.country ?? null}
        isAnonymous={player?.name == null}
        lang={lang}
      />
    </>
  );
}
