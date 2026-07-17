import { loadCountryFactors, loadItems, getCountry } from '@/lib/data';
import { computeCO2 } from '@/lib/emissions';
import { formatCO2 } from '@/lib/format';
import { getDailyRounds, todayUtc } from '@/lib/daily-service';
import { q } from '@/lib/db';
import type { Item } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Internal inventory page for playtest feedback: every item numbered, with
 * its physical value and hourly emissions at the grid extremes, today's daily
 * set, and the most-served pairs. Lightly password-protected — it's a game,
 * not sensitive data.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const adminKey = process.env.ADMIN_KEY ?? 'dev-admin';
  if (key !== adminKey) {
    return (
      <main className="screen" style={{ paddingTop: 60 }}>
        <form method="GET" className="card" style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            name="key"
            placeholder="Password"
            autoFocus
            className="card"
            style={{ flex: 1, padding: '10px 12px', fontSize: '1rem' }}
          />
          <button
            type="submit"
            style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 10, padding: '0 18px', fontWeight: 700 }}
          >
            →
          </button>
        </form>
      </main>
    );
  }

  const items = [...loadItems()].sort((a, b) => a.id.localeCompare(b.id));
  const fra = getCountry('FRA');
  const ind = getCountry('IND');
  const nor = getCountry('NOR');
  const factorsCount = loadCountryFactors().length;

  const value = (i: Item): string => {
    switch (i.energy_model) {
      case 'power':
        return `${i.power_watts} W · ${i.carrier}`;
      case 'per_event':
        return `${i.kwh_per_event} kWh/${i.event_noun?.en}`;
      case 'task':
        return `${Math.round((i.efficiency ?? 0) * 100)}% eff · ${i.carrier}`;
      case 'per_km':
        if (i.uses_country_car_default) return 'country car avg';
        if (i.kwh_per_km != null) return `${i.kwh_per_km} kWh/km`;
        return `${i.gco2_per_km} gCO₂/km · ${i.carrier}`;
    }
  };

  const typicalUse = (i: Item): { label: string; qty: number } => {
    const qty = i.clue_quantities?.[1] ?? { minutes: 30, hours: 2, events: 1, km: 10, liters_boiled: 1 }[i.typical_unit];
    return { label: `${qty} ${i.typical_unit.replace('_', ' ')}`, qty };
  };

  const daily = await getDailyRounds(todayUtc());
  const topPairs = await q<{ item_a: string; item_b: string; n: string; avg: string | null }>(
    `SELECT r.item_a, r.item_b, count(g.id)::text AS n, round(avg(g.score))::text AS avg
       FROM rounds r LEFT JOIN guesses g ON g.round_id = r.id
      GROUP BY r.item_a, r.item_b
      ORDER BY count(g.id) DESC
      LIMIT 30`,
  );

  const cellStyle = { padding: '4px 8px', borderBottom: '1px solid var(--line)', textAlign: 'left' as const };

  return (
    <main className="screen" style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: '1.3rem' }}>Admin — item inventory</h1>
      <p className="muted">
        {items.length} items · {factorsCount} countries · emissions shown for one typical use
        (2nd clue quantity) at the grid extremes.
      </p>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              {['#', 'item', 'id', 'model / value', 'diff', 'typical use', '🇳🇴 NOR', '🇫🇷 FRA', '🇮🇳 IND'].map((h) => (
                <th key={h} style={{ ...cellStyle, fontWeight: 700 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => {
              const { label, qty } = typicalUse(i);
              return (
                <tr key={i.id}>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>
                    {i.emoji} {i.name.en}
                  </td>
                  <td style={cellStyle}>
                    <code>{i.id}</code>
                  </td>
                  <td style={cellStyle}>{value(i)}</td>
                  <td style={cellStyle}>{i.difficulty}</td>
                  <td style={cellStyle}>{label}</td>
                  <td style={cellStyle}>{formatCO2(computeCO2(i, qty, nor).grams, 'en')}</td>
                  <td style={cellStyle}>{formatCO2(computeCO2(i, qty, fra).grams, 'en')}</td>
                  <td style={cellStyle}>{formatCO2(computeCO2(i, qty, ind).grams, 'en')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: '1.1rem' }}>Today’s Daily Game ({todayUtc()})</h2>
      <div className="card">
        {daily.map((r, i) => (
          <div key={r.id} className="conversion-row">
            <span className="muted">D{i + 1}</span>
            <span>
              {r.round_type === 'binary' ? '⚖️' : '🎚️'} {r.item_a} ({Number(r.qty_a)})
              {' vs '}
              {r.item_b}
              {r.qty_b != null ? ` (${Number(r.qty_b)})` : ''}
            </span>
            <span className="muted">diff {r.difficulty}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.1rem' }}>Most-served pairs (all time)</h2>
      <div className="card">
        {topPairs.map((p, i) => (
          <div key={i} className="conversion-row">
            <span className="muted">{i + 1}</span>
            <span>
              {p.item_a} → {p.item_b}
            </span>
            <span className="value">
              {p.n}× {p.avg != null ? `· avg ${p.avg}` : ''}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
