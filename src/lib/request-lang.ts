import { headers } from 'next/headers';
import { resolveLang } from './i18n';
import type { Lang } from './types';

/** The page language: ?lang= (via proxy.ts), else Accept-Language, else English. */
export async function requestLang(): Promise<Lang> {
  const h = await headers();
  return resolveLang(h.get('x-emy-lang'), h.get('accept-language'));
}
