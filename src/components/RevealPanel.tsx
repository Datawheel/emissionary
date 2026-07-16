'use client';

import type { Breakdown } from '@/lib/emissions';
import type { ClientItem, GuessResponse, RevealItemInfo } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { formatCO2, formatQty } from '@/lib/format';
import { logPosition } from '@/lib/rounds';
import ConversionTable from './ConversionTable';

export default function RevealPanel({
  data,
  itemA,
  itemB,
  lang,
}: {
  data: GuessResponse;
  itemA: ClientItem;
  itemB: ClientItem;
  lang: Lang;
}) {
  const { truth, guess, score } = data;
  const min = data.slider_min ?? truth / 100;
  const max = data.slider_max ?? truth * 100;
  const truthPos = clampPct(logPosition(truth, min, max));
  const guessPos = guess != null ? clampPct(logPosition(guess, min, max)) : null;
  const scoreClass = score >= 70 ? 'good' : score < 40 ? 'bad' : '';

  return (
    <>
      <section className="card" aria-live="polite">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1rem' }}>{t('results', lang)}</h2>
          <span className={`score-pill ${scoreClass}`}>
            +{score} {t('points', lang)}
          </span>
        </div>
        <div className="log-axis" style={{ margin: '26px 8px 8px' }}>
          {[0.25, 0.5, 0.75].map((p) => (
            <span key={p} className="tick" style={{ left: `${p * 100}%` }} />
          ))}
          {guessPos != null && <span className="marker guess" style={{ left: `${guessPos}%` }} />}
          <span className="marker truth" style={{ left: `${truthPos}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <div>
            <div className="muted">🟡 {t('your_guess', lang)}</div>
            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {guess != null ? qtyLabel(guess, itemB, lang) : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted">🟢 {t('truth', lang)}</div>
            <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{qtyLabel(truth, itemB, lang)}</div>
          </div>
        </div>
        {data.equivalence && (
          <p className="muted" style={{ marginTop: 10 }}>
            {t('equivalent_to', lang)} {L(data.equivalence, lang)} — {formatCO2(data.grams_target, lang)}
          </p>
        )}
        <details className="breakdown">
          <summary>{t('how_computed', lang)}</summary>
          <BreakdownBlock breakdown={data.breakdown_a} info={data.item_info_a} item={itemA} lang={lang} />
          <BreakdownBlock breakdown={data.breakdown_b} info={data.item_info_b} item={itemB} lang={lang} />
        </details>
      </section>
      <ConversionTable rows={data.conversion_rows} note={data.takeaway} itemB={itemB} lang={lang} />
    </>
  );
}

function BreakdownBlock({
  breakdown,
  info,
  item,
  lang,
}: {
  breakdown: Breakdown;
  info: RevealItemInfo;
  item: ClientItem;
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
        {L(info.assumption_note, lang)}{' '}
        {info.sources.map((src) => (
          <a key={src.url} href={src.url} target="_blank" rel="noreferrer">
            [{src.publisher}, {src.year}]
          </a>
        ))}
      </p>
    </div>
  );
}

export function qtyLabel(qty: number, item: ClientItem, lang: Lang): string {
  if (item.typical_unit === 'events' && item.event_noun) {
    return `${formatQty(qty, 'events', lang).replace('×', '')} ${L(item.event_noun, lang)}`;
  }
  return formatQty(qty, item.typical_unit, lang);
}

function clampPct(p: number): number {
  return Math.min(98, Math.max(2, p * 100));
}
