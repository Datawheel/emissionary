'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardPage } from '@/lib/leaderboard';
import type { Lang } from '@/lib/types';
import { pluralWord, t } from '@/lib/i18n';
import Loader from './Loader';
import BackLink from './BackLink';
import type { CountryOption } from '@/lib/country-names';
import NamePrompt, { namePromptDismissed } from './NamePrompt';
import OecBadge from './OecBadge';
import { OEC_LINKED_EVENT, OEC_SETTLED_EVENT } from './OecSessionLink';

type Scope = 'daily' | 'alltime' | 'days';

export default function LeaderboardClient({
  countries,
  lang,
  canClaimName = false,
}: {
  countries: CountryOption[];
  lang: Lang;
  canClaimName?: boolean;
}) {
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  useEffect(() => {
    // set after mount — localStorage and the iframe state are client-only (avoids hydration mismatch)
    if (!canClaimName || namePromptDismissed()) {
      setShowNamePrompt(false);
      return;
    }
    // Inside OEC the visitor may be signed in: wait for the handshake to finish, since it
    // can hand over a name and make the prompt pointless. A guest sees it right after.
    if (window === window.top || window.__emyOecSettled) {
      setShowNamePrompt(true);
      return;
    }
    const show = () => setShowNamePrompt(true);
    window.addEventListener(OEC_SETTLED_EVENT, show, { once: true });
    return () => window.removeEventListener(OEC_SETTLED_EVENT, show);
  }, [canClaimName]);
  const [scope, setScope] = useState<Scope>('alltime');
  const [country, setCountry] = useState<string>('');
  const [page, setPage] = useState<LeaderboardPage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Scope, c: string) => {
    setLoading(true);
    const params = new URLSearchParams({ scope: s });
    if (c) params.set('country', c);
    const res = await fetch(`/api/leaderboard?${params}`);
    if (res.ok) setPage((await res.json()) as LeaderboardPage);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(scope, country);
  }, [scope, country, load]);

  useEffect(() => {
    // the OEC link changed who "you" are (or your name): reload what was fetched before it
    const reload = () => void load(scope, country);
    window.addEventListener(OEC_LINKED_EVENT, reload);
    return () => window.removeEventListener(OEC_LINKED_EVENT, reload);
  }, [scope, country, load]);

  const scopes: { key: Scope; label: string }[] = [
    { key: 'alltime', label: t('all_time', lang) },
    { key: 'daily', label: t('today', lang) },
    { key: 'days', label: t('days_played', lang) },
  ];

  const youOffPage = page?.you && !page.rows.some((r) => r.is_you);

  return (
    <main className="screen">
      <BackLink lang={lang} />
      <h1 style={{ fontSize: '1.3rem' }}>{t('leaderboard', lang)}</h1>
      <p className="muted">{t('practice_note', lang)}</p>
      {showNamePrompt && (
        <NamePrompt
          lang={lang}
          onDone={(claimed) => {
            setShowNamePrompt(false);
            if (claimed) void load(scope, country);
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 6 }} role="tablist">
        {scopes.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={scope === s.key}
            className="header-btn"
            style={{
              background: scope === s.key ? 'var(--ink)' : 'var(--card)',
              color: scope === s.key ? 'var(--paper)' : 'var(--ink)',
              border: '1px solid var(--line)',
              minHeight: 40,
            }}
            onClick={() => setScope(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <select
        className="card"
        style={{ padding: '10px 12px', fontSize: '0.95rem' }}
        value={country}
        aria-label={t('all_countries', lang)}
        onChange={(e) => setCountry(e.target.value)}
      >
        <option value="">{t('all_countries', lang)}</option>
        {countries.map((c) => (
          <option key={c.iso3} value={c.iso3}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>

      {loading || !page ? (
        <Loader lang={lang} />
      ) : (
        <section className="card">
          {page.rows.length === 0 && <p className="muted">—</p>}
          {page.rows.length > 0 && <HeaderRow scope={scope} lang={lang} showDays={page.rows[0].days != null} />}
          {page.rows.map((r) => (
            <div key={`${r.rank}-${r.name}`} className={`conversion-row lb-row${r.days != null ? ' with-days' : ''}${r.is_you ? ' own' : ''}`}>
              <span className="muted">#{r.rank}</span>
              <span className="lb-name">
                <span aria-hidden="true">{r.flag}</span>
                <span className="lb-name-text">{r.name || t('anonymous_you', lang)}</span>
                {r.oec && <OecBadge lang={lang} />}
                {r.is_you && <strong className="lb-you">· {t('you', lang)}</strong>}
              </span>
              <ValueCells scope={scope} r={r} />
            </div>
          ))}
          {youOffPage && page.you && (
            <div
              className={`conversion-row lb-row${page.you.days != null ? ' with-days' : ''} own`}
              style={{ borderTop: '2px dashed var(--line)' }}
            >
              <span className="muted">#{page.you.rank}</span>
              <span className="lb-name">
                <span aria-hidden="true">{page.you.flag}</span>
                <span className="lb-name-text">{page.you.name || t('anonymous_you', lang)}</span>
                {page.you.oec && <OecBadge lang={lang} />}
                <strong className="lb-you">· {t('you', lang)}</strong>
              </span>
              <ValueCells scope={scope} r={page.you} />
            </div>
          )}
        </section>
      )}
      {page?.distribution && page.all_players > 0 && (
        <Distribution page={page} lang={lang} />
      )}
    </main>
  );
}

/** "3 days · 1,240" when sorting by days played; "1,240 · 3 days" otherwise. */
/** Points (and, on the all-time/days boards, days played) as separate cells; the ranked one is bold. */
function ValueCells({ scope, r }: { scope: Scope; r: { score: number; days?: number | null } }) {
  if (r.days == null) return <span className="value">{r.score}</span>;
  return (
    <>
      <span className="value" style={{ fontWeight: scope === 'days' ? 400 : 700 }}>{r.score}</span>
      <span className="value" style={{ fontWeight: scope === 'days' ? 700 : 400 }}>{r.days}</span>
    </>
  );
}

function HeaderRow({ scope, lang, showDays }: { scope: Scope; lang: Lang; showDays: boolean }) {
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  return (
    <div className={`conversion-row lb-row lb-head muted${showDays ? ' with-days' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span className="value" style={{ fontWeight: scope === 'days' ? 400 : 700 }}>{cap(pluralWord('points', 2, lang))}</span>
      {showDays && (
        <span className="value" style={{ fontWeight: scope === 'days' ? 700 : 400 }}>{cap(pluralWord('days', 2, lang))}</span>
      )}
    </div>
  );
}

/** Histogram of all players' results with the viewer's bucket highlighted. */
function Distribution({ page, lang }: { page: LeaderboardPage; lang: Lang }) {
  const d = page.distribution!;
  const maxCount = Math.max(...d.buckets, 1);
  const youValue = page.you ? (d.metric === 'days' ? page.you.days : page.you.score) : null;
  const youBucket =
    youValue != null && d.max > d.min
      ? Math.min(d.buckets.length - 1, Math.floor(((youValue - d.min) / (d.max + 1e-9 - d.min)) * d.buckets.length))
      : youValue != null
        ? 0
        : null;

  return (
    <section className="card">
      <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>{t('all_players', lang)}</h2>
      {youBucket != null && <p className="muted">{t('histogram_note', lang)}</p>}
      <div
        style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, marginTop: 28 }}
        role="img"
        aria-label={t('all_players', lang)}
      >
        {d.buckets.map((n, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              flex: 1,
              height: `${Math.max(3, (100 * n) / maxCount)}%`,
              borderRadius: 4,
              background: i === youBucket ? 'var(--spark)' : '#ded8ca',
            }}
            title={String(n)}
          >
            {i === youBucket && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: 4,
                  whiteSpace: 'nowrap',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--spark-deep)',
                }}
              >
                {t('you', lang)}
                {youValue != null ? ` · ${Math.round(youValue)}` : ''}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted">
        <span>{Math.round(d.min)}</span>
        <span>{d.metric === 'days' ? t('axis_days', lang) : t('axis_points', lang)}</span>
        <span>{Math.round(d.max)}</span>
      </div>
      {page.you_top_pct != null && (
        <p style={{ marginTop: 6, fontWeight: 600 }}>
          {t('you_top_pct', lang, { pct: page.you_top_pct, total: page.all_players })}
        </p>
      )}
    </section>
  );
}
