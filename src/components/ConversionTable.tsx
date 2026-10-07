'use client';

import { useState } from 'react';
import type { ConversionRow, Takeaway } from '@/lib/conversion';
import type { ClientItem } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { L, pluralWord, t } from '@/lib/i18n';
import { formatCO2, formatItemQty, proseName } from '@/lib/format';

/** Ribbon semantics: bar color encodes how clean the electricity is for this row. */
function barColor(dirtiness: number): string {
  const f = Math.min(1, Math.max(0, dirtiness));
  return `hsl(${150 - 135 * f}, 60%, 44%)`;
}

export default function ConversionTable({
  rows,
  note,
  clue,
  itemB,
  lang,
}: {
  rows: ConversionRow[];
  note: Takeaway | null;
  /** the concrete anchor, e.g. "10 km of Petrol car" */
  clue: string;
  itemB: ClientItem;
  lang: Lang;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxLog = Math.max(...rows.map((r) => Math.log10(r.qtyB)));
  const minLog = Math.min(...rows.map((r) => Math.log10(r.qtyB)));
  const span = Math.max(maxLog - minLog, 0.01);
  const shown = expanded ? rows : rows.slice(0, 9);
  const gAll = rows.map((r) => Math.log10(r.gramsA));
  const gLo = Math.min(...gAll);
  const gHi = Math.max(...gAll);
  const dirtiness = (row: ConversionRow): number =>
    gHi - gLo > 0.05
      ? (Math.log10(row.gramsA) - gLo) / (gHi - gLo)
      : 1 - (Math.log10(row.qtyB) - minLog) / span;
  const itemBName = proseName(L(itemB.name, lang), lang);

  const noteText = note
    ? t(note.kind === 'a_cleaner' ? 'takeaway_cleaner' : 'takeaway_more', lang, {
        clean: L(note.clean, lang),
        dirty: L(note.dirty, lang),
        ratio: note.ratio,
        times: pluralWord('times', note.ratio, lang),
        clue,
        item: itemBName,
      })
    : null;

  // same-carrier pairs: the equivalence is flat, so show what the CLUE itself
  // emits per country instead — that is where the story is
  if (maxLog - minLog < 0.02) {
    const byGrams = [...rows].sort((a, b) => a.gramsA - b.gramsA);
    const gMax = Math.log10(byGrams[byGrams.length - 1].gramsA);
    const gMin = Math.log10(byGrams[0].gramsA);
    const gSpan = Math.max(gMax - gMin, 0.01);
    const gramsVary = byGrams[byGrams.length - 1].gramsA / byGrams[0].gramsA >= 1.5;

    return (
      <section className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>{t('around_the_world', lang)}</h2>
        {gramsVary ? (
          <>
            <p className="muted" style={{ marginBottom: 8 }}>
              {t('emissions_context', lang, { clue })}
            </p>
            <div role="table" aria-label={t('around_the_world', lang)}>
              {(expanded ? byGrams : byGrams.slice(0, 9)).map((row) => (
                <div key={row.iso3} className={`conversion-row${row.isPlayer ? ' own' : ''}`} role="row">
                  <span aria-hidden="true">{row.flag}</span>
                  <div>
                    <div style={{ fontWeight: row.isPlayer ? 700 : 500 }}>{L(row.name, lang)}</div>
                    <div className="bar-track" aria-hidden="true">
                      <div
                        className="bar"
                        style={{
                          width: `${8 + (92 * (Math.log10(row.gramsA) - gMin)) / gSpan}%`,
                          background: barColor((Math.log10(row.gramsA) - gMin) / gSpan),
                        }}
                      />
                    </div>
                  </div>
                  <span className="value">{formatCO2(row.gramsA, lang)}</span>
                </div>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              {t('answer_same_everywhere', lang)}
            </p>
          </>
        ) : (
          <p className="muted">{t('same_everywhere', lang, { clue, item: itemBName })}</p>
        )}
      </section>
    );
  }

  return (
    <section className="card">
      <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>{t('around_the_world', lang)}</h2>
      <p className="muted" style={{ marginBottom: 8 }}>
        {t('conversion_context', lang, { clue, item: itemBName })}
      </p>
      <div role="table" aria-label={t('around_the_world', lang)}>
        {shown.map((row) => (
          <div key={row.iso3} className={`conversion-row${row.isPlayer ? ' own' : ''}`} role="row">
            <span aria-hidden="true">{row.flag}</span>
            <div>
              <div style={{ fontWeight: row.isPlayer ? 700 : 500 }}>{L(row.name, lang)}</div>
              <div className="bar-track" aria-hidden="true">
                <div
                  className="bar"
                  style={{
                    width: `${8 + (92 * (Math.log10(row.qtyB) - minLog)) / span}%`,
                    background: barColor(dirtiness(row)),
                  }}
                />
              </div>
            </div>
            <span className="value">{formatItemQty(row.qtyB, itemB, lang)}</span>
          </div>
        ))}
      </div>
      {rows.length > 9 && !expanded && (
        <button className="muted" style={{ minHeight: 44 }} onClick={() => setExpanded(true)}>
          {t('see_all_countries', lang)} ↓
        </button>
      )}
      {noteText && <p className="takeaway" style={{ marginTop: 10 }}>{noteText}</p>}
    </section>
  );
}
