import type { Localized } from '@/lib/types';

/** Test-fixture text in every language (fixtures don't need real translations). */
export const loc = (en: string, es: string = en): Localized => ({ en, es, fr: en, de: en, ru: en, zh: en });
