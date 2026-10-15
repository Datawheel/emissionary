import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

/** In-page way back to the start screen, for the secondary screens (leaderboard, stats, about). */
export default function BackLink({ lang }: { lang: Lang }) {
  return (
    <Link href={`/?lang=${lang}`} className="back-link">
      <span aria-hidden="true">←</span> {t('home', lang)}
    </Link>
  );
}
