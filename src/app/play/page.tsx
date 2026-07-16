import AppHeader from '@/components/AppHeader';
import GameClient from '@/components/GameClient';
import { loadCountryFactors, loadItems, loadSources } from '@/lib/data';
import { pickLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; country?: string }>;
}) {
  const params = await searchParams;
  const lang = pickLang(params.lang);
  const country = params.country ?? 'FRA';
  return (
    <>
      <AppHeader lang={lang} />
      <GameClient
        items={loadItems()}
        factors={loadCountryFactors()}
        sources={loadSources()}
        playerIso={country}
        lang={lang}
      />
    </>
  );
}
