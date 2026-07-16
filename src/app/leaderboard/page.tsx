import AppHeader from '@/components/AppHeader';
import LeaderboardClient from '@/components/LeaderboardClient';
import { loadCountryFactors } from '@/lib/data';
import { pickLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  const countries = loadCountryFactors().map((c) => ({ iso3: c.iso3, name: c.name, flag: c.flag }));
  return (
    <>
      <AppHeader lang={lang} />
      <LeaderboardClient countries={countries} lang={lang} />
    </>
  );
}
