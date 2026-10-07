import type { Metadata, Viewport } from 'next';
import { clueTitle } from '@/lib/format';
import { loadItems } from '@/lib/data';
import { t } from '@/lib/i18n';
import { requestLang } from '@/lib/request-lang';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a1626',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await requestLang();
  return (
    <html lang={lang === 'zh' ? 'zh-Hans' : lang}>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`,
          }}
        />
      </body>
    </html>
  );
}
