'use client';

/**
 * Global country setting (spec §5): visible on every page. Changing it
 * switches the grid assumptions for everything that follows. Daily Games in
 * progress stay in the country of their first guess (server-enforced).
 */
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import type { CountryOption } from '@/lib/country-names';

export default function CountryMenu({
  current,
  countries,
  lang,
}: {
  current: string;
  countries: CountryOption[];
  lang: Lang;
}) {
  const cf = countries.find((c) => c.iso3 === current);

  async function change(iso3: string) {
    if (!iso3 || iso3 === current) return;
    const res = await fetch('/api/player', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: iso3 }),
    });
    if (res.ok) window.location.reload();
  }

  return (
    <label className="header-btn country-menu">
      <span aria-hidden="true">{cf?.flag ?? '🌍'}</span>
      <span>{current}</span>
      <select
        aria-label={t('country_menu_label', lang)}
        value={current}
        onChange={(e) => void change(e.target.value)}
      >
        {countries.map((c) => (
          <option key={c.iso3} value={c.iso3}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
