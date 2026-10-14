'use client';

import { useEffect } from 'react';

const CLIENT = 'ca-pub-1706971377772539';

declare global {
  interface Window {
    adsbygoogle?: object[];
  }
}

function removeAds() {
  document.getElementById('emy-ads')?.remove();
  document.querySelectorAll('iframe').forEach((frame) => {
    const src = frame.src || '';
    if (src.includes('googlesyndication') || src.includes('doubleclick') || src.includes('googleads')) {
      frame.remove();
    }
  });
}

/**
 * Page-level AdSense. Mounted only when the embed URL has consent=true, and
 * the effect bails out otherwise so the script is never requested without it.
 */
export default function Ads({ consent }: { consent: boolean }) {
  useEffect(() => {
    if (!consent) {
      removeAds();
      return;
    }
    if (document.getElementById('emy-ads')) return;
    const script = document.createElement('script');
    script.id = 'emy-ads';
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
    script.addEventListener('load', () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: CLIENT,
          enable_page_level_ads: true,
        });
      } catch {
        /* blocked or rejected */
      }
    });
    document.head.appendChild(script);
  }, [consent]);

  return null;
}
