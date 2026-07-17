'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardPage } from '@/lib/leaderboard';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import type { CountryOption } from './CountryPicker';
import NamePrompt, { namePromptDismissed } from './NamePrompt';

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
    // set after mount — localStorage is client-only (avoids hydration mismatch)
    if (canClaimName && !namePromptDismissed()) setShowNamePrompt(true);
  }, [canClaimName]);
  const [scope, setScope] = useState<Scope>('daily');
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

  const scopes: { key: Scope; label: string }[] = [
    { key: 'daily', label: t('today', lang) },
    { key: 'alltime', label: t('all_time', lang) },
    { key: 'days', label: t('days_played', lang) },
  ];

  const youOffPage = page?.you && !page.rows.some((r) => r.is_you);

  return (
    <main className="screen">
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
        <p className="muted">{t('loading', lang)}</p>
      ) : (
        <section className="card">
          {page.rows.length === 0 && <p className="muted">—</p>}
          {page.rows.map((r) => (
            <div key={`${r.rank}-${r.name}`} className={`conversion-row${r.is_you ? ' own' : ''}`}>
              <span className="muted">#{r.rank}</span>
              <span>
                {r.flag} {r.name} {r.is_you && <strong>· {t('you', lang)}</strong>}
              </span>
              <span className="value">
                {scope === 'days' && r.days != null
                  ? `${r.days} ${t('days_short', lang)} · ${r.score}`
                  : r.days != null
                    ? `${r.score} · ${r.days}${t('days_short', lang)[0]}`
                    : r.score}
              </span>
            </div>
          ))}
          {youOffPage && page.you && (
            <div className="conversion-row own" style={{ borderTop: '2px dashed var(--line)' }}>
              <span className="muted">#{page.you.rank}</span>
              <span>
                {page.you.flag} {page.you.name} <strong>· {t('you', lang)}</strong>
              </span>
              <span className="value">
                {scope === 'days' && page.you.days != null
                  ? `${page.you.days} ${t('days_short', lang)} · ${page.you.score}`
                  : page.you.days != null
                    ? `${page.you.score} · ${page.you.days}${t('days_short', lang)[0]}`
                    : page.you.score}
              </span>
            </div>
          )}
        </section>
      )}
      {page?.distribution && page.total_players > 0 && (
        <Distribution page={page} lang={lang} />
      )}
    </main>
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
  const pct = page.you ? Math.max(1, Math.round((100 * page.you.rank) / Math.max(1, page.total_players))) : null;

  return (
    <section className="card">
      <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>{t('all_players', lang)}</h2>
      <div
        style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, marginTop: 8 }}
        role="img"
        aria-label={t('all_players', lang)}
      >
        {d.buckets.map((n, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(3, (100 * n) / maxCount)}%`,
              borderRadius: 4,
              background: i === youBucket ? 'var(--spark)' : '#ded8ca',
            }}
            title={String(n)}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted">
        <span>{Math.round(d.min)}</span>
        <span>{d.metric === 'days' ? t('days_short', lang) : t('points', lang)}</span>
        <span>{Math.round(d.max)}</span>
      </div>
      {page.you && pct != null && (
        <p style={{ marginTop: 6, fontWeight: 600 }}>
          {t('you_rank', lang, { rank: page.you.rank, total: page.total_players, pct })}
        </p>
      )}
    </section>
  );
}
