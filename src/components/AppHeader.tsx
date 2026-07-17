import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { loadCountryFactors } from '@/lib/data';
import { currentPlayer } from '@/lib/player';
import CountryMenu from './CountryMenu';

/**
 * Global navigation: brand, country setting (grid assumptions), leaderboard.
 * Server component — reads the player cookie to show the current country.
 */
export default async function AppHeader({
  lang,
  right,
}: {
  lang: Lang;
  right?: React.ReactNode;
}) {
  const player = await currentPlayer().catch(() => null);
  const countries = player
    ? loadCountryFactors().map((c) => ({ iso3: c.iso3, name: c.name, flag: c.flag }))
    : [];

  return (
    <header className="app-header">
      <Link className="brand" href={`/?lang=${lang}`}>
        Emission<span>ary</span>
      </Link>
      <div className="header-actions">
        {right}
        {player && <CountryMenu current={player.country} countries={countries} lang={lang} />}
        <Link className="header-btn" href={`/leaderboard?lang=${lang}`}>
          🏆 <span className="hide-narrow">{t('leaderboard', lang)}</span>
        </Link>
      </div>
    </header>
  );
}
