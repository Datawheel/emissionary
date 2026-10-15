import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

/** Spinner + label for the client screens that wait on the first fetch. */
export default function Loader({ lang }: { lang: Lang }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-spinner" aria-hidden="true" />
      <p className="muted">{t('loading', lang)}</p>
    </div>
  );
}
