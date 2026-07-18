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
 * First-visit welcome screen (spec §5): a few words on how to play and what
 * counts (use-phase only), then country selection. Tapping the country card
 * opens the searchable list; "Next" confirms and starts the game.
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
  const [selected, setSelected] = useState(
    () => countries.find((c) => c.iso3 === suggested) ?? countries.find((c) => c.iso3 === 'FRA')!,
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(s) || c.iso3.toLowerCase().includes(s));
  }, [countries, search]);

  return (
    <main className="screen" style={{ paddingTop: 32 }}>
      <h1 style={{ fontSize: '1.3rem', textAlign: 'center' }}>{t('tagline', lang)}</h1>
      <p style={{ textAlign: 'center' }}>{t('intro_how', lang)}</p>
      <p className="muted" style={{ textAlign: 'center', fontSize: '0.92rem' }}>
        {t('intro_boundary', lang)}
      </p>

      <h2 style={{ fontSize: '1.05rem', textAlign: 'center', marginTop: 12 }}>
        {t('choose_country', lang)}
      </h2>
      <p className="muted" style={{ textAlign: 'center', fontSize: '0.92rem' }}>
        {lang === 'es'
          ? 'Las emisiones de la electricidad dependen de la red de tu país.'
          : 'Electricity emissions depend on your country’s grid.'}
      </p>

      <button
        className="card item-card"
        style={{ width: '100%' }}
        onClick={() => setBrowsing((b) => !b)}
        data-testid="country-select"
      >
        <div className="emoji" aria-hidden="true">
          {selected.flag}
        </div>
        <div>
          <div className="qty">{selected.name}</div>
          <div className="name">{t('tap_to_change', lang)}</div>
        </div>
      </button>

      {browsing && (
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
          <div style={{ maxHeight: '40dvh', overflowY: 'auto' }}>
            {filtered.slice(0, 50).map((c) => (
              <button
                key={c.iso3}
                className="conversion-row"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => {
                  setSelected(c);
                  setBrowsing(false);
                  setSearch('');
                }}
              >
                <span aria-hidden="true">{c.flag}</span>
                <span>{c.name}</span>
                <span className="muted">{c.iso3}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!browsing && (
        <button
          className="primary"
          style={{ width: '100%' }}
          onClick={() => onConfirm(selected.iso3)}
          data-testid="confirm-country"
        >
          {t('next', lang)}
        </button>
      )}
    </main>
  );
}
