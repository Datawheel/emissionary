'use client';

import type { Breakdown } from '@/lib/emissions';
import type { ClientItem, GuessResponse, RevealItemInfo, UnitFact } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { L, pluralWord, t } from '@/lib/i18n';
import { clueLabel, formatCO2, formatItemQty, formatKwh, unitClueTitle } from '@/lib/format';
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
            +{score} {pluralWord('points', score, lang)}
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
              {guess != null ? formatItemQty(guess, itemB, lang) : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted">🟢 {t('truth', lang)}</div>
            <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{formatItemQty(truth, itemB, lang)}</div>
          </div>
        </div>
        <UnitFacts facts={data.unit_facts} lang={lang} />
        <details className="breakdown">
          <summary>{t('how_computed', lang)}</summary>
          <BreakdownBlock breakdown={data.breakdown_a} info={data.item_info_a} item={itemA} lang={lang} />
          <BreakdownBlock breakdown={data.breakdown_b} info={data.item_info_b} item={itemB} lang={lang} />
        </details>
      </section>
      <ConversionTable
        rows={data.conversion_rows}
        note={data.takeaway}
        clue={clueLabel(data.breakdown_a.quantity, itemA, lang)}
        itemB={itemB}
        lang={lang}
      />
    </>
  );
}

/** The memorable per-unit numbers, shown after every answer. */
export function UnitFacts({ facts, lang }: { facts: UnitFact[]; lang: Lang }) {
  return (
    <div className="unit-facts">
      <p className="muted" style={{ marginBottom: 4 }}>
        {t('unit_facts_title', lang)}
      </p>
      {facts.map((f, i) => (
        <p key={i} className="unit-fact">
          {/* "1 min of hairdryer = 0.03 kWh or 12 g CO₂" */}
          <span aria-hidden="true">{f.emoji}</span> {unitClueTitle(f, lang)} ={' '}
          {f.kwh != null && (
            <>
              <strong>{formatKwh(f.kwh, lang)}</strong> {t('or', lang)}{' '}
            </>
          )}
          <strong>{formatCO2(f.grams, lang)}</strong>
        </p>
      ))}
    </div>
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
          <span className="label">{L(s.label, lang)}</span>
          <span className="math">{L(s.math, lang)}</span>
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

function clampPct(p: number): number {
  return Math.min(98, Math.max(2, p * 100));
}
