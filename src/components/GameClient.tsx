'use client';

/**
 * Server-driven Free Play loop: rounds come from /api/freeplay/next,
 * truths only ever arrive in the /api/guess response (spec §12).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientRound, FreeplayTotals, GuessResponse } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import RoundView from './RoundView';
import CountryPicker from './CountryPicker';
import type { CountryOption } from '@/lib/country-names';

type Phase = 'country' | 'loading' | 'guess' | 'reveal' | 'error';

export default function GameClient({
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

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">
          {t('free_play', lang)} · {flag} · #{(totals?.rounds_played ?? 0) + (phase === 'reveal' ? 0 : 1)}
        </span>
        <span className="score-pill">{sessionScore}</span>
      </div>

      <RoundView
        round={round}
        phase={phase === 'reveal' ? 'reveal' : 'guess'}
        reveal={reveal}
        guess={guess}
        onGuessChange={setGuess}
        onBinaryChoice={(choice) => void submit({ choice })}
        flag={flag}
        lang={lang}
      />

      <div className="bottom-bar">
        {phase === 'guess' && !isBinary ? (
          <button className="primary" disabled={guess == null} onClick={() => void submit({ value: guess! })}>
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
