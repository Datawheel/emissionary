import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { embedSearch } from '@/lib/embed';
import { t } from '@/lib/i18n';
import { loadCountryFactors } from '@/lib/data';
import { countryOptions } from '@/lib/country-names';
import { currentPlayer } from '@/lib/player';
import { requestEmbed } from '@/lib/request-embed';
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
  const { theme, consent } = await requestEmbed();
  const q = embedSearch(lang, theme, consent);

  return (
    <header className="app-header">
      <Link className="brand" href={`/?${q}`}>
        Emission<span>ary</span>
      </Link>
      <div className="header-actions">
        {right}
        {player && <CountryMenu current={player.country} countries={countries} lang={lang} />}
        <Link className="header-btn" href={`/leaderboard?${q}`}>
          🏆 <span className="hide-narrow">{t('leaderboard', lang)}</span>
        </Link>
        <Link className="header-btn" href={`/about?${q}`} aria-label={t('about', lang)}>
          <span className="hide-narrow">{t('about', lang)}</span>
          <span className="show-narrow" aria-hidden="true">
            ⓘ
          </span>
        </Link>
        <LanguageMenu lang={lang} />
      </div>
    </header>
  );
}
