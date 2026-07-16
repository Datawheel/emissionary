'use client';

/**
 * Server-driven Free Play loop (M2): rounds come from /api/freeplay/next,
 * truths only ever arrive in the /api/guess response (spec §12).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientRound, FreeplayTotals, GuessResponse } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { formatCO2 } from '@/lib/format';
import LogSlider from './LogSlider';
import RevealPanel, { qtyLabel } from './RevealPanel';
import CountryPicker, { type CountryOption } from './CountryPicker';
import NamePrompt, { namePromptDismissed } from './NamePrompt';

type Phase = 'country' | 'loading' | 'guess' | 'reveal' | 'error';

export default function GameClient({
  countries,
  suggested,
  hasPlayer,
  playerCountry,
  isAnonymous = true,
  lang,
}: {
  countries: CountryOption[];
  suggested: string;
  hasPlayer: boolean;
  playerCountry: string | null;
  isAnonymous?: boolean;
  lang: Lang;
}) {
  const [phase, setPhase] = useState<Phase>(hasPlayer ? 'loading' : 'country');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [named, setNamed] = useState(!isAnonymous);
  const [round, setRound] = useState<ClientRound | null>(null);
  const [totals, setTotals] = useState<FreeplayTotals | null>(null);
  const [reveal, setReveal] = useState<GuessResponse | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [country, setCountry] = useState<string | null>(playerCountry);
  const startedAt = useRef(Date.now());

  const flag = countries.find((c) => c.iso3 === country)?.flag ?? '';

  const fetchNext = useCallback(async () => {
    setPhase('loading');
    setReveal(null);
    setGuess(null);
    try {
      const res = await fetch('/api/freeplay/next');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { round: ClientRound; totals: FreeplayTotals };
      setRound(data.round);
      setTotals(data.totals);
      startedAt.current = Date.now();
      setPhase('guess');
      window.scrollTo({ top: 0 });
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    if (hasPlayer) void fetchNext();
  }, [hasPlayer, fetchNext]);

  async function confirmCountry(iso3: string) {
    setPhase('loading');
    const res = await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: iso3 }),
    });
    if (res.ok) {
      setCountry(iso3);
      void fetchNext();
    } else {
      setPhase('error');
    }
  }

  async function submit(input: { value?: number; choice?: 'a' | 'b' }) {
    if (!round) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: round.round_id,
          ms_elapsed: Date.now() - startedAt.current,
          ...input,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as GuessResponse;
      setReveal(data);
      setTotals(data.totals);
      setSessionScore((s) => s + data.score);
      setPhase('reveal');
      // identity prompt after the 3rd Free Play round (spec §10), once, dismissible
      if (!named && data.totals.rounds_played >= 3 && !namePromptDismissed()) {
        setShowNamePrompt(true);
      }
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
        <button className="card" style={{ width: '100%' }} onClick={() => void fetchNext()}>
          {t('error_retry', lang)}
        </button>
      </main>
    );
  }

  if (!round || (phase === 'loading' && !reveal)) {
    return (
      <main className="screen" style={{ paddingTop: 60, textAlign: 'center' }}>
        <p className="muted">{t('loading', lang)}</p>
      </main>
    );
  }

  const isBinary = round.round_type === 'binary';
  const initialGuess = Math.sqrt((round.slider_min ?? 1) * (round.slider_max ?? 1));

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">
          {t('free_play', lang)} · {flag} · #{(totals?.rounds_played ?? 0) + 1}
        </span>
        <span className="score-pill">{sessionScore}</span>
      </div>

      {isBinary ? (
        <>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('which_emits_more', lang)}</p>
          <div className="binary-choice">
            {(['a', 'b'] as const).map((side) => {
              const item = side === 'a' ? round.item_a : round.item_b;
              const qty = side === 'a' ? round.qty_a : round.qty_b!;
              const picked = reveal?.choice === side;
              return (
                <button
                  key={side}
                  className="card item-card"
                  aria-pressed={picked}
                  disabled={phase === 'reveal'}
                  onClick={() => void submit({ choice: side })}
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

      {showNamePrompt && (
        <NamePrompt
          lang={lang}
          onDone={(n) => {
            setShowNamePrompt(false);
            if (n) setNamed(true);
          }}
        />
      )}

      <div className="bottom-bar">
        {phase === 'guess' && !isBinary ? (
          <button className="primary" onClick={() => void submit({ value: guess ?? initialGuess })}>
            {t('submit_guess', lang)}
          </button>
        ) : phase === 'reveal' ? (
          <button className="primary" onClick={() => void fetchNext()}>
            {t('next_round', lang)}
          </button>
        ) : null}
      </div>
    </main>
  );
}
