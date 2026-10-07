'use client';

import type { Lang } from '@/lib/types';
import { LANG_NAMES, LANGS, t } from '@/lib/i18n';

/** Compact language switcher: shows the current code, opens a native select. */
export default function LanguageMenu({ lang }: { lang: Lang }) {
  function change(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.location.assign(url);
  }

  return (
    <label className="header-btn country-menu">
      <span aria-hidden="true">{lang.toUpperCase()}</span>
      <select aria-label={t('language', lang)} value={lang} onChange={(e) => change(e.target.value)}>
        {LANGS.map((l) => (
          <option key={l} value={l} lang={l}>
            {LANG_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
