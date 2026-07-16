'use client';

import { useState } from 'react';
import type { ConversionRow, Takeaway } from '@/lib/conversion';
import type { Item, Lang } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { formatQty } from '@/lib/format';

export default function ConversionTable({
  rows,
  note,
  itemB,
  lang,
}: {
  rows: ConversionRow[];
  note: Takeaway | null;
  itemB: Item;
  lang: Lang;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxLog = Math.max(...rows.map((r) => Math.log10(r.qtyB)));
  const minLog = Math.min(...rows.map((r) => Math.log10(r.qtyB)));
  const span = Math.max(maxLog - minLog, 0.01);
  const shown = expanded ? rows : rows.slice(0, 9);

  return (
    <section className="card">
      <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>{t('around_the_world', lang)}</h2>
      {note && (
        <p className="takeaway" style={{ marginBottom: 8 }}>
          {t(note.kind === 'a_cleaner' ? 'takeaway_cleaner' : 'takeaway_more', lang, {
            clean: note.clean,
            dirty: note.dirty,
            ratio: note.ratio,
          })}
        </p>
      )}
      <div role="table" aria-label={t('around_the_world', lang)}>
        {shown.map((row) => (
          <div key={row.iso3} className={`conversion-row${row.isPlayer ? ' own' : ''}`} role="row">
            <span aria-hidden="true">{row.flag}</span>
            <div>
              <div style={{ fontWeight: row.isPlayer ? 700 : 500 }}>{row.name}</div>
              <div className="bar-track" aria-hidden="true">
                <div
                  className="bar"
                  style={{ width: `${8 + (92 * (Math.log10(row.qtyB) - minLog)) / span}%` }}
                />
              </div>
            </div>
            <span className="value">
              {item2Label(row.qtyB, itemB, lang)}
            </span>
          </div>
        ))}
      </div>
      {rows.length > 9 && !expanded && (
        <button className="muted" style={{ minHeight: 44 }} onClick={() => setExpanded(true)}>
          {t('see_all_countries', lang)} ↓
        </button>
      )}
    </section>
  );
}

function item2Label(qty: number, itemB: Item, lang: Lang): string {
  if (itemB.typical_unit === 'events' && itemB.event_noun) {
    return `${formatQty(qty, 'events', lang).replace('×', '')} ${L(itemB.event_noun, lang)}`;
  }
  return formatQty(qty, itemB.typical_unit, lang);
}
