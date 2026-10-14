import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { embedSearch } from '@/lib/embed';
import { t } from '@/lib/i18n';
import { requestEmbed } from '@/lib/request-embed';
import { requestLang } from '@/lib/request-lang';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const lang = await requestLang();
  const { theme, consent } = await requestEmbed();
  const q = `?${embedSearch(lang, theme, consent)}`;
  return (
    <>
      <AppHeader lang={lang} />
      <main className="screen" style={{ paddingTop: 36, gap: 16, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.4rem', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Emission<span style={{ color: 'var(--spark-deep)' }}>ary</span>
        </h1>
        <div className="hero-axis" aria-hidden="true">
          {[14, 33.2, 47.7, 62.3, 81.5].map((p) => (
            <span key={p} className="tick" style={{ left: `${p}%` }} />
          ))}
          <span className="marker" />
        </div>
        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('tagline', lang)}</p>
        <p className="muted">{t('subtitle', lang)}</p>
        <Link
          href={`/daily${q}`}
          className="card"
          style={{
            fontWeight: 800,
            fontSize: '1.15rem',
            textDecoration: 'none',
            padding: 18,
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--display)',
            boxShadow: '0 4px 0 rgba(34,28,51,0.35)',
          }}
        >
          📅 {t('daily_game', lang)}
        </Link>
        <Link
          href={`/play${q}`}
          className="card"
          style={{ fontWeight: 800, fontSize: '1.15rem', textDecoration: 'none', padding: 18, fontFamily: 'var(--display)' }}
        >
          ♾️ {t('free_play', lang)}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Link href={`/leaderboard${q}`} className="muted">
            🏆 {t('leaderboard', lang)}
          </Link>
          <Link href={`/stats${q}`} className="muted">
            {t('stats', lang)}
          </Link>
          <Link href={`/about${q}`} className="muted">
            {t('about', lang)}
          </Link>
        </div>
      </main>
    </>
  );
}
