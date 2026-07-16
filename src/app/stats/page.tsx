import AppHeader from '@/components/AppHeader';
import StatsClient from '@/components/StatsClient';
import { pickLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  return (
    <>
      <AppHeader lang={lang} />
      <StatsClient lang={lang} />
    </>
  );
}
