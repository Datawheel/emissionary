import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { pickLang, t } from '@/lib/i18n';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  return (
    <>
      <AppHeader lang={lang} />
      <main className="screen" style={{ paddingTop: 40, gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: '3.4rem' }} aria-hidden="true">
          💨🌍
        </div>
        <h1 style={{ fontSize: '1.9rem', letterSpacing: '-0.01em' }}>
          Emission<span style={{ color: 'var(--spark-deep)' }}>ary</span>
        </h1>
        <p className="muted" style={{ fontSize: '1rem' }}>
          {t('tagline', lang)}
        </p>
        <Link
          href={`/play?lang=${lang}`}
          className="card"
          style={{ fontWeight: 800, fontSize: '1.15rem', textDecoration: 'none', padding: '18px' }}
        >
          ▶ {t('free_play', lang)}
        </Link>
        <p className="muted">{t('daily_game', lang)} — soon</p>
      </main>
    </>
  );
}
