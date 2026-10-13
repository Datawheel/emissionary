import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

/** Marks a leaderboard player who signed in with an OEC account. */
export default function OecBadge({ lang }: { lang: Lang }) {
  return (
    <span
      title={t('oec_account', lang)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        padding: '2px 4px',
        borderRadius: 4,
        background: '#fff',
        border: '1px solid var(--line)',
        verticalAlign: 'middle',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/oec-logo.svg" alt="OEC" style={{ height: 10, width: 'auto', display: 'block' }} />
    </span>
  );
}
