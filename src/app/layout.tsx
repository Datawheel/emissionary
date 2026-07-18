import type { Metadata, Viewport } from 'next';
import './globals.css';

const DESCRIPTION =
  'How good is your carbon intuition? Test your knowledge of everyday emissions — a game by the OEC.';

export const metadata: Metadata = {
  metadataBase: new URL('https://emi.cesarhidalgo.com'),
  title: 'Emissionary',
  description: DESCRIPTION,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Emissionary',
    title: 'Emissionary — how good is your carbon intuition?',
    description: DESCRIPTION,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Emissionary: 10 min of hairdryer = how many hours of refrigerator?',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emissionary — how good is your carbon intuition?',
    description: DESCRIPTION,
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a1626',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
