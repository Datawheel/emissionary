'use client';

import type { Breakdown } from '@/lib/emissions';
import type { ConversionRow, Takeaway } from '@/lib/conversion';
import type { Item, Lang, Source } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { formatCO2, formatQty } from '@/lib/format';
import { logPosition } from '@/lib/rounds';
import ConversionTable from './ConversionTable';

export interface RevealData {
  truth: number;
  guess: number;
  score: number;
  min: number;
  max: number;
  gramsTarget: number;
  breakdownA: Breakdown;
  breakdownB: Breakdown;
  conversionRows: ConversionRow[];
  note: Takeaway | null;
  equivalence?: string;
}

export default function RevealPanel({
  data,
  itemA,
  itemB,
  sources,
  lang,
}: {
  data: RevealData;
  itemA: Item;
  itemB: Item;
  sources: Source[];
  lang: Lang;
}) {
  const { truth, guess, score, min, max } = data;
  const truthPos = clampPct(logPosition(truth, min, max));
  const guessPos = clampPct(logPosition(guess, min, max));
  const scoreClass = score >= 70 ? 'good' : score < 40 ? 'bad' : '';

  return (
    <>
      <section className="card" aria-live="polite">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1rem' }}>{t('results', lang)}</h2>
          <span className={`score-pill ${scoreClass}`}>+{score} {t('points', lang)}</span>
        </div>
        <div className="log-axis" style={{ margin: '26px 8px 8px' }}>
          {[0.25, 0.5, 0.75].map((p) => (
            <span key={p} className="tick" style={{ left: `${p * 100}%` }} />
          ))}
          <span className="marker guess" style={{ left: `${guessPos}%` }} title={t('your_guess', lang)} />
          <span className="marker truth" style={{ left: `${truthPos}%` }} title={t('truth', lang)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <div>
            <div className="muted">🟡 {t('your_guess', lang)}</div>
            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {qtyLabel(guess, itemB, lang)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted">🟢 {t('truth', lang)}</div>
            <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {qtyLabel(truth, itemB, lang)}
            </div>
          </div>
        </div>
        {data.equivalence && (
          <p className="muted" style={{ marginTop: 10 }}>
            {t('equivalent_to', lang)} {data.equivalence} — {formatCO2(data.gramsTarget, lang)}
          </p>
        )}
        <details className="breakdown">
          <summary>{t('how_computed', lang)}</summary>
          <BreakdownBlock breakdown={data.breakdownA} item={itemA} sources={sources} lang={lang} />
          <BreakdownBlock breakdown={data.breakdownB} item={itemB} sources={sources} lang={lang} />
        </details>
      </section>
      <ConversionTable rows={data.conversionRows} note={data.note} itemB={itemB} lang={lang} />
    </>
  );
}

function BreakdownBlock({
  breakdown,
  item,
  sources,
  lang,
}: {
  breakdown: Breakdown;
  item: Item;
  sources: Source[];
  lang: Lang;
}) {
  return (
    <div className="breakdown-item">
      <div style={{ fontWeight: 700, margin: '8px 0 2px' }}>
        {item.emoji} {L(item.name, lang)} — {formatCO2(breakdown.grams, lang)}
      </div>
      {breakdown.steps.map((s, i) => (
        <div key={i} className="step">
          <span className="label">{lang === 'es' ? s.label_es : s.label_en}</span>
          <span className="math">{s.math}</span>
        </div>
      ))}
      <p className="assumption">
        {L(item.assumption_note, lang)}{' '}
        {item.source_ids.map((id) => {
          const src = sources.find((s) => s.source_id === id);
          return src ? (
            <a key={id} href={src.url} target="_blank" rel="noreferrer">
              [{src.publisher}, {src.year}]
            </a>
          ) : null;
        })}
      </p>
    </div>
  );
}

function qtyLabel(qty: number, item: Item, lang: Lang): string {
  if (item.typical_unit === 'events' && item.event_noun) {
    return `${formatQty(qty, 'events', lang).replace('×', '')} ${L(item.event_noun, lang)}`;
  }
  return formatQty(qty, item.typical_unit, lang);
}

function clampPct(p: number): number {
  return Math.min(98, Math.max(2, p * 100));
}
