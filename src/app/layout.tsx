import type { Metadata, Viewport } from 'next';
import { clueTitle } from '@/lib/format';
import { loadItems } from '@/lib/data';
import { t } from '@/lib/i18n';
import { requestEmbed } from '@/lib/request-embed';
import { requestLang } from '@/lib/request-lang';
import Ads from '@/components/Ads';
import OecSessionLink from '@/components/OecSessionLink';
import { parseEmbedParents } from '@/lib/csp.mjs';
import './globals.css';

/** Public base URL, used for absolute social-preview links. Set SITE_URL in .env. */
const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await requestLang();
  const title = `Emissionary — ${t('tagline', lang)}`;
  const description = t('meta_description', lang);
  const hairdryer = loadItems().find((i) => i.id === 'hairdryer')!;
  const alt = `Emissionary: ${clueTitle(10, hairdryer, lang)} = ${t('og_question', lang).replaceAll('**', '')}`;
  const image = `/og-${lang}.png`;
  return {
    metadataBase: new URL(SITE_URL),
    title: 'Emissionary',
    description,
    manifest: '/manifest.webmanifest',
    icons: { icon: '/icon.svg' },
    openGraph: {
      type: 'website',
      url: `/?lang=${lang}`,
      siteName: 'Emissionary',
      title,
      description,
      locale: lang,
      images: [{ url: image, width: 1200, height: 630, alt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await requestEmbed();
  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: theme === 'dark' ? '#16131f' : '#1a1626',
    colorScheme: theme,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await requestLang();
  const { theme, consent } = await requestEmbed();
  return (
    <html lang={lang === 'zh' ? 'zh-Hans' : lang} data-theme={theme}>
      <head>
        <link
          rel="preload"
          href="/fonts/bricolage-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <Ads consent={consent} />
        <OecSessionLink consent={consent} extraParents={parseEmbedParents(process.env.EMBED_PARENTS)} />
        <script
          dangerouslySetInnerHTML={{
            // The worker caches /_next/static cache-first: right for production (hashed, immutable
            // files) but it serves stale CSS/JS in dev. Dev removes any worker and its cache instead.
            __html:
              process.env.NODE_ENV === 'production'
                ? `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`
                : `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})});if(window.caches){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})})}}`,
          }}
        />
      </body>
    </html>
  );
}
