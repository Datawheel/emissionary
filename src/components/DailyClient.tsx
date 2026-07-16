'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientRound, GuessResponse } from '@/lib/api-types';
import type { DailyProgress } from '@/lib/daily-service';
import type { Lang } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { formatCO2 } from '@/lib/format';
import LogSlider from './LogSlider';
import RevealPanel, { qtyLabel } from './RevealPanel';
import CountryPicker, { type CountryOption } from './CountryPicker';
import NamePrompt, { namePromptDismissed } from './NamePrompt';
import ShareCard from './ShareCard';

type Phase = 'country' | 'loading' | 'guess' | 'reveal' | 'done' | 'error';

const MAX_TOTAL = 450; // 1 binary (50) + 4 quantitative (100 each)

export default function DailyClient({
  countries,
  suggested,
  hasPlayer,
  playerCountry,
  isAnonymous,
  lang,
}: {
  countries: CountryOption[];
  suggested: string;
  hasPlayer: boolean;
  playerCountry: string | null;
  isAnonymous: boolean;
  lang: Lang;
}) {
  const [phase, setPhase] = useState<Phase>(hasPlayer ? 'loading' : 'country');
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  const [reveal, setReveal] = useState<GuessResponse | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [country, setCountry] = useState<string | null>(playerCountry);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [named, setNamed] = useState(!isAnonymous);
  const [top, setTop] = useState<{ rank: number; name: string; flag: string; score: number; is_you: boolean }[]>([]);
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
        if (!named && !namePromptDismissed()) setShowNamePrompt(true);
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
  }, [named]);

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
        <p className="muted">{t('loading', lang)}</p>
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
          {progress.percentile != null && (
            <p className="muted">{t('percentile', lang, { pct: progress.percentile })}</p>
          )}
        </div>
        {showNamePrompt && (
          <NamePrompt
            lang={lang}
            onDone={(n) => {
              setShowNamePrompt(false);
              if (n) setNamed(true);
            }}
          />
        )}
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
            <h2 style={{ fontSize: '1rem', marginBottom: 6 }}>{t('leaderboard', lang)} · {t('today', lang)}</h2>
            {top.map((r) => (
              <div key={r.rank + r.name} className={`conversion-row${r.is_you ? ' own' : ''}`}>
                <span className="muted">#{r.rank}</span>
                <span>
                  {r.flag} {r.name}
                </span>
                <span className="value">{r.score}</span>
              </div>
            ))}
          </section>
        )}
      </main>
    );
  }

  // ——— play ———
  const round = progress.rounds[progress.next_index ?? 0];
  const isBinary = round.round_type === 'binary';
  const initialGuess = isBinary ? 0 : Math.sqrt(round.slider_min! * round.slider_max!);
  const roundLabel = `${(progress.next_index ?? 0) + 1} ${t('of', lang)} 5`;

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">
          {t('daily_game', lang)} #{progress.day_number} · {roundLabel} · {flag}
        </span>
        <span className="score-pill">{progress.total + (reveal?.score ?? 0)}</span>
      </div>

      {isBinary ? (
        <>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('which_emits_more', lang)}</p>
          <div className="binary-choice">
            {(['a', 'b'] as const).map((side) => {
              const item = side === 'a' ? round.item_a : round.item_b;
              const qty = side === 'a' ? round.qty_a : round.qty_b!;
              return (
                <button
                  key={side}
                  className="card item-card"
                  aria-pressed={reveal?.choice === side}
                  disabled={phase === 'reveal'}
                  onClick={() => void submit(round, { choice: side })}
                >
                  <div className="emoji" aria-hidden="true">
                    {item.emoji}
                  </div>
                  <div>
                    <div className="qty">{qtyLabel(qty, item, lang)}</div>
                    <div className="name">{L(item.name, lang)}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {phase === 'reveal' && reveal && (
            <section className="card" aria-live="polite">
              <span className={`score-pill ${reveal.correct ? 'good' : 'bad'}`}>
                {reveal.correct ? '✓' : '✗'} +{reveal.score} {t('points', lang)}
              </span>
              <p className="muted" style={{ marginTop: 8 }}>
                {round.item_a.emoji} {formatCO2(reveal.grams_a!, lang)} · {round.item_b.emoji}{' '}
                {formatCO2(reveal.grams_b!, lang)}
              </p>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="card item-card">
            <div className="emoji" aria-hidden="true">
              {round.item_a.emoji}
            </div>
            <div>
              <div className="qty">
                {qtyLabel(round.qty_a, round.item_a, lang)} <span aria-hidden="true">{flag}</span>
              </div>
              <div className="name">{L(round.item_a.name, lang)}</div>
            </div>
          </div>
          <p className="vs-divider">{t('equals_question', lang)}</p>
          <div className="card item-card">
            <div className="emoji" aria-hidden="true">
              {round.item_b.emoji}
            </div>
            <div>
              <div className="qty">{t('how_many', lang)}</div>
              <div className="name">{L(round.item_b.name, lang)}</div>
            </div>
          </div>
          {phase === 'guess' && (
            <div className="card slider-block">
              <LogSlider
                min={round.slider_min!}
                max={round.slider_max!}
                value={guess ?? initialGuess}
                onChange={setGuess}
                unit={round.item_b.typical_unit}
                lang={lang}
                eventNoun={round.item_b.event_noun ? L(round.item_b.event_noun, lang) : undefined}
              />
            </div>
          )}
          {phase === 'reveal' && reveal && (
            <RevealPanel data={reveal} itemA={round.item_a} itemB={round.item_b} lang={lang} />
          )}
        </>
      )}

      <div className="bottom-bar">
        {phase === 'guess' && !isBinary ? (
          <button className="primary" onClick={() => void submit(round, { value: guess ?? initialGuess })}>
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
