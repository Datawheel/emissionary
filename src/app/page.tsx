import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { pickLang, t } from '@/lib/i18n';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  const q = `?lang=${lang}`;
  return (
    <>
      <AppHeader lang={lang} />
      <main className="screen" style={{ paddingTop: 32, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: '3.2rem' }} aria-hidden="true">
          💨🌍
        </div>
        <h1 style={{ fontSize: '1.9rem', letterSpacing: '-0.01em' }}>
          Emission<span style={{ color: 'var(--spark-deep)' }}>ary</span>
        </h1>
        <p className="muted" style={{ fontSize: '1rem' }}>
          {t('tagline', lang)}
        </p>
        <Link
          href={`/daily${q}`}
          className="card"
          style={{ fontWeight: 800, fontSize: '1.15rem', textDecoration: 'none', padding: 18, background: 'var(--ink)', color: 'var(--paper)' }}
        >
          📅 {t('daily_game', lang)}
        </Link>
        <Link
          href={`/play${q}`}
          className="card"
          style={{ fontWeight: 800, fontSize: '1.15rem', textDecoration: 'none', padding: 18 }}
        >
          ♾️ {t('free_play', lang)}
        </Link>
        <Link href={`/leaderboard${q}`} className="muted" style={{ padding: 8 }}>
          🏆 {t('leaderboard', lang)}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Link href={`/about${q}`} className="muted">
            {t('about', lang)}
          </Link>
          <Link href={`/stats${q}`} className="muted">
            {t('stats', lang)}
          </Link>
          <Link href={lang === 'en' ? '/?lang=es' : '/?lang=en'} className="muted">
            {lang === 'en' ? 'Español' : 'English'}
          </Link>
        </div>
      </main>
    </>
  );
}
