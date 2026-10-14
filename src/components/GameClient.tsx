'use client';

/**
 * Server-driven Free Play survival run: rounds come from /api/freeplay/next,
 * truths only ever arrive in the /api/guess response (spec §12). Three
 * 0-point rounds (strikes) end the run; the server owns the run state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientRound, FreeplayTotals, GuessResponse } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { pluralWord, t } from '@/lib/i18n';
import RoundView from './RoundView';
import CountryPicker from './CountryPicker';
import type { CountryOption } from '@/lib/country-names';
import { PLAYER_READY_EVENT } from './OecSessionLink';

type Phase = 'country' | 'loading' | 'guess' | 'reveal' | 'over' | 'error';

export default function GameClient({
  countries,
  suggested,
  hasPlayer,
  playerCountry,
  lang,
  consent,
}: {
  countries: CountryOption[];
  suggested: string;
  hasPlayer: boolean;
  playerCountry: string | null;
  lang: Lang;
  /** False: play in memory. No player cookie, no guesses stored, no ads. */
  consent: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(hasPlayer ? 'loading' : 'country');
  // The run rules are open on tall screens; on short ones they start closed so the slider stays in view.
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => {
    setRulesOpen(window.innerHeight > 760);
  }, []);
  const [round, setRound] = useState<ClientRound | null>(null);
  const [totals, setTotals] = useState<FreeplayTotals | null>(null);
  const [reveal, setReveal] = useState<GuessResponse | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [country, setCountry] = useState<string | null>(playerCountry);
  const startedAt = useRef(Date.now());
  const tokenRef = useRef<string | null>(null);
  const guestScores = useRef<number[]>([]);
  const guestPairs = useRef<string[]>([]);
  const guestBest = useRef(0);

  const flag = countries.find((c) => c.iso3 === country)?.flag ?? '';

  const fetchNext = useCallback(async (iso3?: string) => {
    setPhase('loading');
    setReveal(null);
    setGuess(null);
    try {
      const res = consent
        ? await fetch('/api/freeplay/next')
        : await fetch('/api/guest/round', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              country: iso3 ?? country,
              pairs: guestPairs.current,
              scores: guestScores.current,
              best: guestBest.current,
            }),
          });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { round: ClientRound; totals: FreeplayTotals; token?: string };
      tokenRef.current = data.token ?? null;
      setRound(data.round);
      setTotals(data.totals);
      startedAt.current = Date.now();
      setPhase('guess');
      window.scrollTo({ top: 0 });
    } catch {
      setPhase('error');
    }
  }, [consent, country]);

  useEffect(() => {
    if (hasPlayer) void fetchNext();
  }, [hasPlayer, fetchNext]);

  async function confirmCountry(iso3: string) {
    setCountry(iso3);
    if (!consent) {
      void fetchNext(iso3);
      return;
    }
    setPhase('loading');
    const res = await fetch('/api/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: iso3 }),
    });
    if (res.ok) {
      window.dispatchEvent(new Event(PLAYER_READY_EVENT));
      void fetchNext();
    } else {
      setPhase('error');
    }
  }

  async function submit(input: { value?: number; choice?: 'a' | 'b' }) {
    if (!round) return;
    setPhase('loading');
    try {
      const res = consent
        ? await fetch('/api/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              round_id: round.round_id,
              ms_elapsed: Date.now() - startedAt.current,
              ...input,
            }),
          })
        : await fetch('/api/guest/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: tokenRef.current,
              scores: guestScores.current,
              best: guestBest.current,
              ...input,
            }),
          });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as GuessResponse;
      if (!consent) {
        guestPairs.current = [...guestPairs.current, [round.item_a.id, round.item_b.id].sort().join('|')].slice(-30);
        guestScores.current = [...guestScores.current, data.score];
        guestBest.current = data.totals.best_run_rounds;
      }
      setReveal(data);
      setTotals(data.totals);
      setPhase('reveal');
    } catch {
      setPhase('error');
    }
  }

  function playAgain() {
    if (!consent) {
      guestBest.current = Math.max(guestBest.current, guestScores.current.length);
      guestScores.current = [];
      guestPairs.current = [];
    }
    void fetchNext();
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

  const run = totals?.run;
  const best = totals?.best_run_rounds ?? 0;

  if (phase === 'over' && run) {
    const roundsLabel = (n: number) => `${n} ${pluralWord('rounds', n, lang)}`;
    return (
      <main className="screen" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.3rem' }}>{t('game_over', lang)}</h1>
        <section className="card">
          <p className="muted">{t('run_lasted', lang)}</p>
          <div className="readout">
            {run.rounds}
            <span className="unit">{pluralWord('rounds', run.rounds, lang)}</span>
          </div>
          <p style={{ fontWeight: 700 }}>
            {run.score} {pluralWord('points', run.score, lang)}
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            {run.rounds > 0 && run.rounds >= best
              ? `🏅 ${t('new_best', lang)}`
              : t('personal_best', lang, { rounds: roundsLabel(best) })}
          </p>
        </section>
        <div className="bottom-bar">
          <button className="primary" onClick={playAgain}>
            {t('play_again', lang)}
          </button>
        </div>
      </main>
    );
  }

  const isBinary = round.round_type === 'binary';
  const struck = phase === 'reveal' && reveal?.score === 0;

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="muted">
          {t('free_play', lang)} · {flag} · #{(run?.rounds ?? 0) + (phase === 'reveal' ? 0 : 1)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {run && <Strikes used={run.strikes} max={run.max_strikes} lang={lang} />}
          <span className="score-pill">{run?.score ?? 0}</span>
        </span>
      </div>
      {run && run.rounds === 0 && phase === 'guess' && (
        <details className="rules" open={rulesOpen} onToggle={(e) => setRulesOpen(e.currentTarget.open)}>
          <summary>{t('rules_title', lang)}</summary>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            {t('run_rules', lang)}
          </p>
        </details>
      )}
      {struck && run && (
        <p className="strike-note" aria-live="polite">
          ✗ {t('strike_hit', lang, { n: run.strikes, max: run.max_strikes })}
        </p>
      )}

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
        ) : phase === 'reveal' && run?.over ? (
          <button className="primary" onClick={() => setPhase('over')}>
            {t('see_results', lang)}
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

/** Three slots; a filled red ✗ for each strike used. */
function Strikes({ used, max, lang }: { used: number; max: number; lang: Lang }) {
  return (
    <span className="strikes" role="img" aria-label={t('strikes_aria', lang, { n: used, max })}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`strike${i < used ? ' hit' : ''}`} aria-hidden="true">
          ✗
        </span>
      ))}
    </span>
  );
}
