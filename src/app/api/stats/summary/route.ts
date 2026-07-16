import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { loadItems } from '@/lib/data';

/**
 * Public research-telemetry aggregates (spec §13): per-item calibration
 * (median signed log-error), participation counts, most-misjudged pairs.
 * Pure SQL over guesses — no ETL.
 */
export async function GET() {
  const [participation] = await q<{ players: string; guesses: string }>(
    `SELECT count(DISTINCT player_id)::text AS players, count(*)::text AS guesses FROM guesses`,
  );

  const perItem = await q<{ item_b: string; n: string; median_sle: string; over_pct: string }>(
    `SELECT r.item_b, count(*)::text AS n,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY g.signed_log_error)::text AS median_sle,
            (100.0 * count(*) FILTER (WHERE g.signed_log_error > 0) / count(*))::text AS over_pct
       FROM guesses g JOIN rounds r ON r.id = g.round_id
      WHERE g.signed_log_error IS NOT NULL
      GROUP BY r.item_b
     HAVING count(*) >= 10
      ORDER BY abs(percentile_cont(0.5) WITHIN GROUP (ORDER BY g.signed_log_error)) DESC`,
  );

  const perPair = await q<{ item_a: string; item_b: string; n: string; median_sle: string }>(
    `SELECT r.item_a, r.item_b, count(*)::text AS n,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY g.signed_log_error)::text AS median_sle
       FROM guesses g JOIN rounds r ON r.id = g.round_id
      WHERE g.signed_log_error IS NOT NULL
      GROUP BY r.item_a, r.item_b
     HAVING count(*) >= 10
      ORDER BY abs(percentile_cont(0.5) WITHIN GROUP (ORDER BY g.signed_log_error)) DESC
      LIMIT 20`,
  );

  const items = loadItems();
  const meta = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item ? { name: item.name, emoji: item.emoji } : { name: { en: id, es: id }, emoji: '❓' };
  };

  return NextResponse.json(
    {
      players: Number(participation.players),
      guesses: Number(participation.guesses),
      per_item: perItem.map((r) => ({
        item: r.item_b,
        ...meta(r.item_b),
        n: Number(r.n),
        median_signed_log_error: Number(r.median_sle),
        overestimate_pct: Math.round(Number(r.over_pct)),
      })),
      most_misjudged_pairs: perPair.map((r) => ({
        item_a: r.item_a,
        item_b: r.item_b,
        a: meta(r.item_a),
        b: meta(r.item_b),
        n: Number(r.n),
        median_signed_log_error: Number(r.median_sle),
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
