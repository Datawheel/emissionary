'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { shareSquare } from '@/lib/scoring';

/**
 * Wordle-style share text (spec §11): day number, flag, score, one square per
 * round. Never includes items or answers.
 */
export function buildShareText(dayNo: number, flag: string, scores: number[], maxTotal: number): string {
  const total = scores.reduce((a, b) => a + b, 0);
  const squares = scores.map((s) => shareSquare(s)).join('');
  return `Emissionary #${dayNo} ${flag} ${total}/${maxTotal}\n${squares}\nemissionary.oec.world`;
}

export default function ShareCard({
  dayNo,
  flag,
  scores,
  maxTotal,
  lang,
}: {
  dayNo: number;
  flag: string;
  scores: number[];
  maxTotal: number;
  lang: Lang;
}) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(dayNo, flag, scores, maxTotal);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <pre style={{ fontFamily: 'inherit', fontSize: '1rem', whiteSpace: 'pre-wrap', marginBottom: 10 }}>{text}</pre>
      <button className="primary" style={{ minHeight: 48, width: '100%', borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontWeight: 700 }} onClick={() => void share()}>
        {copied ? t('copied', lang) : `📤 ${t('share', lang)}`}
      </button>
    </div>
  );
}
