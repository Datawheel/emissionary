import AppHeader from '@/components/AppHeader';
import StatsClient from '@/components/StatsClient';
import { requestLang } from '@/lib/request-lang';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const lang = await requestLang();
  return (
    <>
      <AppHeader lang={lang} />
      <StatsClient lang={lang} />
    </>
  );
}
