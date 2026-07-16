'use client';

/**
 * Public calibration stats (spec §13), in the spirit of the WTC stats page.
 * Bars reuse the log-axis grammar: signed log-error diverging from a zero line.
 */
import { useEffect, useState } from 'react';
import type { Lang, Localized } from '@/lib/types';
import { L, t } from '@/lib/i18n';

interface ItemStat {
  item: string;
  name: Localized;
  emoji: string;
  n: number;
  median_signed_log_error: number;
  overestimate_pct: number;
}

interface PairStat {
  a: { name: Localized; emoji: string };
  b: { name: Localized; emoji: string };
  n: number;
  median_signed_log_error: number;
}

interface Summary {
  players: number;
  guesses: number;
  per_item: ItemStat[];
  most_misjudged_pairs: PairStat[];
}

export default function StatsClient({ lang }: { lang: Lang }) {
  const [data, setData] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/stats/summary')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Summary) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <main className="screen"><p className="muted">{t('error_retry', lang)}</p></main>;
  if (!data) return <main className="screen"><p className="muted">{t('loading', lang)}</p></main>;

  const maxAbs = Math.max(0.1, ...data.per_item.map((i) => Math.abs(i.median_signed_log_error)));

  return (
    <main className="screen">
      <h1 style={{ fontSize: '1.3rem' }}>{t('stats', lang)}</h1>
      <section className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div className="readout" style={{ fontSize: '1.8rem' }}>{data.players.toLocaleString()}</div>
          <div className="muted">{lang === 'es' ? 'jugadores' : 'players'}</div>
        </div>
        <div>
          <div className="readout" style={{ fontSize: '1.8rem' }}>{data.guesses.toLocaleString()}</div>
          <div className="muted">{lang === 'es' ? 'respuestas' : 'guesses'}</div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: 4 }}>
          {lang === 'es' ? 'Calibración por producto' : 'Calibration by item'}
        </h2>
        <p className="muted" style={{ marginBottom: 10 }}>
          {lang === 'es'
            ? '¿La gente sobreestima (→) o subestima (←) las emisiones equivalentes?'
            : 'Do people overestimate (→) or underestimate (←) the equivalent amount?'}
        </p>
        {data.per_item.length === 0 && <p className="muted">{lang === 'es' ? 'Aún no hay datos suficientes.' : 'Not enough data yet.'}</p>}
        {data.per_item.map((i) => {
          const frac = i.median_signed_log_error / maxAbs; // -1..1
          const pct = Math.abs(frac) * 46;
          return (
            <div key={i.item} style={{ margin: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>
                  {i.emoji} {L(i.name, lang)}
                </span>
                <span className="muted">
                  {i.median_signed_log_error > 0 ? '+' : ''}
                  {i.median_signed_log_error.toFixed(2)} · n={i.n}
                </span>
              </div>
              <div className="bar-track" style={{ position: 'relative', height: 10, marginTop: 4 }} aria-hidden="true">
                <span style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: 'var(--ink-soft)' }} />
                <div
                  className="bar"
                  style={{
                    left: frac < 0 ? `${50 - pct}%` : '50%',
                    width: `${pct}%`,
                    right: 'auto',
                    background: frac > 0 ? 'var(--spark)' : 'var(--truth)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>
          {lang === 'es' ? 'Comparaciones más malinterpretadas' : 'Most misjudged comparisons'}
        </h2>
        {data.most_misjudged_pairs.length === 0 && (
          <p className="muted">{lang === 'es' ? 'Aún no hay datos suficientes.' : 'Not enough data yet.'}</p>
        )}
        {data.most_misjudged_pairs.map((p, idx) => (
          <div key={idx} className="conversion-row">
            <span className="muted">{idx + 1}</span>
            <span>
              {p.a.emoji} {L(p.a.name, lang)} → {p.b.emoji} {L(p.b.name, lang)}
            </span>
            <span className="value">
              {p.median_signed_log_error > 0 ? '+' : ''}
              {p.median_signed_log_error.toFixed(2)}
            </span>
          </div>
        ))}
      </section>
      <p className="muted">
        {lang === 'es'
          ? 'El error es el log₁₀ de (respuesta ÷ valor real): +1 significa adivinar 10× de más.'
          : 'Error is log₁₀ of (guess ÷ truth): +1 means guessing 10× too high.'}
      </p>
    </main>
  );
}
