'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientRound, GuessResponse } from '@/lib/api-types';
import type { DailyProgress } from '@/lib/daily-service';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import Loader from './Loader';
import RoundView from './RoundView';
import CountryPicker from './CountryPicker';
import type { CountryOption } from '@/lib/country-names';
import ShareCard from './ShareCard';
import { PLAYER_READY_EVENT } from './OecSessionLink';
import OecBadge from './OecBadge';

type Phase = 'country' | 'loading' | 'guess' | 'reveal' | 'done' | 'error';

const MAX_TOTAL = 450; // 1 binary (50) + 4 quantitative (100 each)

export default function DailyClient({
  countries,
  suggested,
  hasPlayer,
  playerCountry,
  lang,
}: {
  countries: CountryOption[];
  suggested: string;
  hasPlayer: boolean;
  playerCountry: string | null;
  lang: Lang;
}) {
  const [phase, setPhase] = useState<Phase>(hasPlayer ? 'loading' : 'country');
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [reveal, setReveal] = useState<GuessResponse | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [country, setCountry] = useState<string | null>(playerCountry);
  const [top, setTop] = useState<{ rank: number; name: string; flag: string; score: number; is_you: boolean; oec: boolean }[]>([]);
  const startedAt = useRef(Date.now());

  const flag = countries.find((c) => c.iso3 === (progress?.locked_country ?? country))?.flag ?? '';

  const load = useCallback(async () => {
    setPhase('loading');
    setReveal(null);
    setGuess(null);
    try {
      const res = await fetch('/api/daily');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as DailyProgress;
      setProgress(data);
      if (data.completed) {
        setPhase('done');
        const lb = await fetch('/api/leaderboard?scope=daily');
        if (lb.ok) {
          const page = (await lb.json()) as { rows: typeof top };
          setTop(page.rows.slice(0, 10));
        }
      } else {
        startedAt.current = Date.now();
        setPhase('guess');
      }
      window.scrollTo({ top: 0 });
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (hasPlayer) void load();
  }, [hasPlayer, load]);

  async function confirmCountry(iso3: string) {
    setPhase('loading');
    const res = await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: iso3 }),
    });
    if (res.ok) {
      setCountry(iso3);
      window.dispatchEvent(new Event(PLAYER_READY_EVENT));
      void load();
    } else setPhase('error');
  }

  async function submit(round: ClientRound, input: { value?: number; choice?: 'a' | 'b' }) {
    setPhase('loading');
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round_id: round.round_id, ms_elapsed: Date.now() - startedAt.current, ...input }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setReveal((await res.json()) as GuessResponse);
      setPhase('reveal');
    } catch {
      setPhase('error');
    }
  }

  if (phase === 'country') {
    return <CountryPicker countries={countries} suggested={suggested} lang={lang} onConfirm={confirmCountry} />;
  }
  if (phase === 'error') {
    return (
      <main className="screen" style={{ paddingTop: 60, textAlign: 'center' }}>
        <button className="card" style={{ width: '100%' }} onClick={() => void load()}>
          {t('error_retry', lang)}
        </button>
      </main>
    );
  }
  if (!progress || phase === 'loading') {
    return (
      <main className="screen" style={{ paddingTop: 60, textAlign: 'center' }}>
        <Loader lang={lang} />
      </main>
    );
  }

  // ——— completion screen ———
  if (phase === 'done') {
    return (
      <main className="screen">
        <h1 style={{ fontSize: '1.3rem', textAlign: 'center' }}>
          {t('daily_game', lang)} #{progress.day_number}
        </h1>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="readout">
            {progress.total}
            <span className="unit">/ {MAX_TOTAL}</span>
          </div>
          {progress.percentile != null && <p className="muted">{t('percentile', lang, { pct: progress.percentile })}</p>}
        </div>
        <ShareCard
          dayNo={progress.day_number}
          flag={flag}
          scores={progress.scores.map((s) => s ?? 0)}
          maxTotal={MAX_TOTAL}
          lang={lang}
        />
        <Countdown seconds={progress.seconds_to_next} lang={lang} />
        {top.length > 0 && (
          <section className="card">
            <h2 style={{ fontSize: '1rem', marginBottom: 6 }}>
              {t('leaderboard', lang)} · {t('today', lang)}
            </h2>
            {top.map((r) => (
              <div key={`${r.rank}-${r.name}-${r.is_you}`} className={`conversion-row${r.is_you ? ' own' : ''}`}>
                <span className="muted">#{r.rank}</span>
                <span>
                  {r.flag} {r.name || t('anonymous_you', lang)}
                  {r.oec && <OecBadge lang={lang} />}
                </span>
                <span className="value">{r.score}</span>
              </div>
            ))}
            <a href={`/leaderboard?lang=${lang}`} className="muted" style={{ display: 'block', padding: 10 }}>
              {t('leaderboard', lang)} →
            </a>
          </section>
        )}
      </main>
    );
  }

  // ——— play ———
  const round = progress.rounds[progress.next_index ?? 0];
  const isBinary = round.round_type === 'binary';
  const roundLabel = t('round_of', lang, { n: (progress.next_index ?? 0) + 1, total: 5 });

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">
          {t('daily_game', lang)} #{progress.day_number} · {roundLabel} · {flag}
        </span>
        <span className="score-pill">{progress.total + (reveal?.score ?? 0)}</span>
      </div>

      <RoundView
        round={round}
        phase={phase === 'reveal' ? 'reveal' : 'guess'}
        reveal={reveal}
        guess={guess}
        onGuessChange={setGuess}
        onBinaryChoice={(choice) => void submit(round, { choice })}
        flag={flag}
        lang={lang}
      />

      <div className="bottom-bar">
        {phase === 'guess' && !isBinary ? (
          <button className="primary" disabled={guess == null} onClick={() => void submit(round, { value: guess! })}>
            {t('submit_guess', lang)}
          </button>
        ) : phase === 'reveal' ? (
          <button className="primary" onClick={() => void load()}>
            {t('next_round', lang)}
          </button>
        ) : null}
      </div>
    </main>
  );
}

function Countdown({ seconds, lang }: { seconds: number; lang: Lang }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <p className="muted" style={{ textAlign: 'center' }}>
      {t('next_daily_in', lang)}{' '}
      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </strong>
    </p>
  );
}
