import type { Item, Lang } from '@/lib/types';
import { L } from '@/lib/i18n';
import { formatQty } from '@/lib/format';

export default function ItemCard({
  item,
  qty,
  lang,
  flag,
}: {
  item: Item;
  qty?: number;
  lang: Lang;
  flag?: string;
}) {
  const qtyLabel =
    qty != null
      ? item.typical_unit === 'events'
        ? `${formatQty(qty, 'events', lang).replace('×', '')} ${item.event_noun ? L(item.event_noun, lang) : ''}`
        : formatQty(qty, item.typical_unit, lang)
      : null;
  return (
    <div className="card item-card">
      <div className="emoji" aria-hidden="true">
        {item.emoji}
      </div>
      <div>
        {qtyLabel && (
          <div className="qty">
            {qtyLabel} {flag && <span aria-hidden="true">{flag}</span>}
          </div>
        )}
        <div className="name">{L(item.name, lang)}</div>
      </div>
    </div>
  );
}
