import Link from 'next/link';
import type { Lang } from '@/lib/types';

export default function AppHeader({
  lang,
  right,
}: {
  lang: Lang;
  right?: React.ReactNode;
}) {
  return (
    <header className="app-header">
      <Link className="brand" href={`/?lang=${lang}`}>
        Emission<span>ary</span>
      </Link>
      <div className="header-actions">{right}</div>
    </header>
  );
}
