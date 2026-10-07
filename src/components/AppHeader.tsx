import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { loadCountryFactors } from '@/lib/data';
import { countryOptions } from '@/lib/country-names';
import { currentPlayer } from '@/lib/player';
import CountryMenu from './CountryMenu';
import LanguageMenu from './LanguageMenu';

/**
 * Global navigation: brand, country setting (grid assumptions), leaderboard,
 * About, and language.
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
  const countries = player ? countryOptions(loadCountryFactors(), lang) : [];

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
        <Link className="header-btn" href={`/about?lang=${lang}`}>
          {t('about', lang)}
        </Link>
        <LanguageMenu lang={lang} />
      </div>
    </header>
  );
}
