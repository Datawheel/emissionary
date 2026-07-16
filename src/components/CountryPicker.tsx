'use client';

import { useMemo, useState } from 'react';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export interface CountryOption {
  iso3: string;
  name: string;
  flag: string;
}

/**
 * First-visit country confirmation (spec §5): suggest, never silently assume —
 * one tap confirms; a searchable list is one tap further.
 */
export default function CountryPicker({
  countries,
  suggested,
  lang,
  onConfirm,
}: {
  countries: CountryOption[];
  suggested: string;
  lang: Lang;
  onConfirm: (iso3: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const suggestedCountry = countries.find((c) => c.iso3 === suggested) ?? countries.find((c) => c.iso3 === 'FRA')!;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(s) || c.iso3.toLowerCase().includes(s));
  }, [countries, search]);

  return (
    <main className="screen" style={{ paddingTop: 32 }}>
      <h1 style={{ fontSize: '1.3rem', textAlign: 'center' }}>{t('choose_country', lang)}</h1>
      <p className="muted" style={{ textAlign: 'center' }}>
        {lang === 'es'
          ? 'Las emisiones de la electricidad dependen de la red de tu país.'
          : 'Electricity emissions depend on your country’s grid.'}
      </p>
      {!browsing ? (
        <>
          <button
            className="card item-card"
            style={{ width: '100%' }}
            onClick={() => onConfirm(suggestedCountry.iso3)}
            data-testid="confirm-country"
          >
            <div className="emoji" aria-hidden="true">
              {suggestedCountry.flag}
            </div>
            <div>
              <div className="qty">{suggestedCountry.name}</div>
              <div className="name">{t('confirm_country', lang)} ✓</div>
            </div>
          </button>
          <button className="muted" style={{ minHeight: 44 }} onClick={() => setBrowsing(true)}>
            {t('search_country', lang)}
          </button>
        </>
      ) : (
        <>
          <input
            autoFocus
            className="card"
            style={{ width: '100%', fontSize: '1rem' }}
            placeholder={t('search_country', lang)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('search_country', lang)}
          />
          <div style={{ maxHeight: '50dvh', overflowY: 'auto' }}>
            {filtered.slice(0, 50).map((c) => (
              <button
                key={c.iso3}
                className="conversion-row"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => onConfirm(c.iso3)}
              >
                <span aria-hidden="true">{c.flag}</span>
                <span>{c.name}</span>
                <span className="muted">{c.iso3}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
