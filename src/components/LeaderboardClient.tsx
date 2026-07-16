'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardPage } from '@/lib/leaderboard';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import type { CountryOption } from './CountryPicker';

type Scope = 'daily' | 'weekly' | 'alltime';

export default function LeaderboardClient({
  countries,
  lang,
}: {
  countries: CountryOption[];
  lang: Lang;
}) {
  const [scope, setScope] = useState<Scope>('daily');
  const [country, setCountry] = useState<string>('');
  const [page, setPage] = useState<LeaderboardPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Scope, c: string, o: number) => {
    setLoading(true);
    const params = new URLSearchParams({ scope: s, offset: String(o) });
    if (c) params.set('country', c);
    const res = await fetch(`/api/leaderboard?${params}`);
    if (res.ok) setPage((await res.json()) as LeaderboardPage);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(scope, country, offset);
  }, [scope, country, offset, load]);

  const scopes: { key: Scope; label: string }[] = [
    { key: 'daily', label: t('today', lang) },
    { key: 'weekly', label: t('this_week', lang) },
    { key: 'alltime', label: t('all_time', lang) },
  ];

  const youOffPage = page?.you && !page.rows.some((r) => r.is_you);

  return (
    <main className="screen">
      <h1 style={{ fontSize: '1.3rem' }}>{t('leaderboard', lang)}</h1>
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
            onClick={() => {
              setScope(s.key);
              setOffset(0);
            }}
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
        onChange={(e) => {
          setCountry(e.target.value);
          setOffset(0);
        }}
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
              <span className="value">{r.score}</span>
            </div>
          ))}
          {youOffPage && page.you && (
            <div className="conversion-row own" style={{ borderTop: '2px dashed var(--line)' }}>
              <span className="muted">#{page.you.rank}</span>
              <span>
                {page.you.flag} {page.you.name} <strong>· {t('you', lang)}</strong>
              </span>
              <span className="value">{page.you.score}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button
              className="muted"
              style={{ minHeight: 44, visibility: offset > 0 ? 'visible' : 'hidden' }}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              ←
            </button>
            <span className="muted" style={{ alignSelf: 'center' }}>
              {page.total_players}
            </span>
            <button
              className="muted"
              style={{ minHeight: 44, visibility: offset + 50 < page.total_players ? 'visible' : 'hidden' }}
              onClick={() => setOffset(offset + 50)}
            >
              →
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
