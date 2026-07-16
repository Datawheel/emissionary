'use client';

/**
 * M1 local game loop: rounds selected and truths computed client-side with a
 * hardcoded country. Replaced by the server-authoritative API in M2 — do not
 * ship this to production (truths are visible to the client here).
 */
import { useMemo, useRef, useState } from 'react';
import type { CountryFactors, Item, Lang, Source } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { computeCO2, solveEquivalent } from '@/lib/emissions';
import { buildConversionRows, takeaway } from '@/lib/conversion';
import { pairKey, seededRng, selectBinaryRound, selectQuantRound, sliderBounds, type RoundSpec } from '@/lib/rounds';
import { score as scoreFn, scoreBinary } from '@/lib/scoring';
import { formatCO2 } from '@/lib/format';
import LogSlider from './LogSlider';
import ItemCard from './ItemCard';
import RevealPanel, { type RevealData } from './RevealPanel';

interface RoundState {
  spec: RoundSpec;
  itemA: Item;
  itemB: Item;
  truth: number;
  min: number;
  max: number;
}

export default function GameClient({
  items,
  factors,
  playerIso,
  sources,
  lang,
}: {
  items: Item[];
  factors: CountryFactors[];
  playerIso: string;
  sources: Source[];
  lang: Lang;
}) {
  const cf = factors.find((c) => c.iso3 === playerIso)!;
  const rngRef = useRef(seededRng(`local:${Date.now()}`));
  const historyRef = useRef<string[]>([]);
  const roundNoRef = useRef(0);

  const [round, setRound] = useState<RoundState>(() => nextRound());
  const [guess, setGuess] = useState<number | null>(null);
  const [choice, setChoice] = useState<'a' | 'b' | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [binaryResult, setBinaryResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [roundCount, setRoundCount] = useState(1);

  function nextRound(): RoundState {
    const rng = rngRef.current;
    roundNoRef.current += 1;
    const excludePairs = new Set(historyRef.current.slice(-30));
    const isBinary = roundNoRef.current % 4 === 0;
    const spec = isBinary
      ? selectBinaryRound(items, cf, rng, { excludePairs })
      : selectQuantRound(items, cf, rng, { difficulty: 3, excludePairs });
    historyRef.current.push(pairKey(spec.item_a, spec.item_b));
    const itemA = items.find((i) => i.id === spec.item_a)!;
    const itemB = items.find((i) => i.id === spec.item_b)!;
    if (spec.round_type === 'binary') {
      return { spec, itemA, itemB, truth: 0, min: 0, max: 0 };
    }
    const truth = solveEquivalent(itemA, spec.qty_a, itemB, cf).qtyB;
    const { min, max } = sliderBounds(truth, rng);
    return { spec, itemA, itemB, truth, min, max };
  }

  const initialGuess = useMemo(
    () => (round.spec.round_type === 'quant' ? Math.sqrt(round.min * round.max) : 0),
    [round],
  );

  function submitQuant() {
    const g = guess ?? initialGuess;
    const s = scoreFn(g, round.truth);
    const solved = solveEquivalent(round.itemA, round.spec.qty_a, round.itemB, cf);
    const rows = buildConversionRows(round.itemA, round.spec.qty_a, round.itemB, cf, factors);
    setTotal((v) => v + s);
    setReveal({
      truth: round.truth,
      guess: g,
      score: s,
      min: round.min,
      max: round.max,
      gramsTarget: solved.gramsTarget,
      breakdownA: solved.breakdownA,
      breakdownB: solved.breakdownB,
      conversionRows: rows,
      note: takeaway(rows),
    });
  }

  function submitBinary(picked: 'a' | 'b') {
    const gramsA = computeCO2(round.itemA, round.spec.qty_a, cf).grams;
    const gramsB = computeCO2(round.itemB, round.spec.qty_b!, cf).grams;
    const correct = picked === (gramsA > gramsB ? 'a' : 'b');
    const points = scoreBinary(correct);
    setChoice(picked);
    setTotal((v) => v + points);
    setBinaryResult({ correct, points });
  }

  function advance() {
    setRound(nextRound());
    setGuess(null);
    setChoice(null);
    setReveal(null);
    setBinaryResult(null);
    setRoundCount((v) => v + 1);
    window.scrollTo({ top: 0 });
  }

  const isBinary = round.spec.round_type === 'binary';
  const answered = reveal != null || binaryResult != null;

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">
          {t('free_play', lang)} · #{roundCount} · {cf.flag} {cf.name}
        </span>
        <span className="score-pill">{total}</span>
      </div>

      {isBinary ? (
        <>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('which_emits_more', lang)}</p>
          <div className="binary-choice">
            <button
              className="card item-card"
              aria-pressed={choice === 'a'}
              disabled={answered}
              onClick={() => submitBinary('a')}
            >
              <ItemCardInner item={round.itemA} qty={round.spec.qty_a} lang={lang} />
            </button>
            <button
              className="card item-card"
              aria-pressed={choice === 'b'}
              disabled={answered}
              onClick={() => submitBinary('b')}
            >
              <ItemCardInner item={round.itemB} qty={round.spec.qty_b!} lang={lang} />
            </button>
          </div>
          {binaryResult && (
            <section className="card" aria-live="polite">
              <span className={`score-pill ${binaryResult.correct ? 'good' : 'bad'}`}>
                {binaryResult.correct ? '✓' : '✗'} +{binaryResult.points} {t('points', lang)}
              </span>
              <p className="muted" style={{ marginTop: 8 }}>
                {round.itemA.emoji} {formatCO2(computeCO2(round.itemA, round.spec.qty_a, cf).grams, lang)} ·{' '}
                {round.itemB.emoji} {formatCO2(computeCO2(round.itemB, round.spec.qty_b!, cf).grams, lang)}
              </p>
            </section>
          )}
        </>
      ) : (
        <>
          <ItemCard item={round.itemA} qty={round.spec.qty_a} lang={lang} flag={cf.flag} />
          <p className="vs-divider">{t('equals_question', lang)}</p>
          <ItemCard item={round.itemB} lang={lang} />
          {!reveal && (
            <div className="card slider-block">
              <LogSlider
                min={round.min}
                max={round.max}
                value={guess ?? initialGuess}
                onChange={setGuess}
                unit={round.itemB.typical_unit}
                lang={lang}
                eventNoun={round.itemB.event_noun ? L(round.itemB.event_noun, lang) : undefined}
              />
            </div>
          )}
          {reveal && (
            <RevealPanel data={reveal} itemA={round.itemA} itemB={round.itemB} sources={sources} lang={lang} />
          )}
        </>
      )}

      <div className="bottom-bar">
        {!answered && !isBinary ? (
          <button className="primary" onClick={submitQuant}>
            {t('submit_guess', lang)}
          </button>
        ) : answered ? (
          <button className="primary" onClick={advance}>
            {t('next_round', lang)}
          </button>
        ) : null}
      </div>
    </main>
  );
}

function ItemCardInner({ item, qty, lang }: { item: Item; qty: number; lang: Lang }) {
  return (
    <>
      <div className="emoji" aria-hidden="true">
        {item.emoji}
      </div>
      <div>
        <div className="qty">
          {qty} {item.typical_unit === 'events' && item.event_noun ? L(item.event_noun, lang) : unitShort(item.typical_unit, lang)}
        </div>
        <div className="name">{L(item.name, lang)}</div>
      </div>
    </>
  );
}

function unitShort(unit: Item['typical_unit'], lang: Lang): string {
  switch (unit) {
    case 'minutes':
      return 'min';
    case 'hours':
      return 'h';
    case 'km':
      return 'km';
    case 'liters_boiled':
      return 'L';
    default:
      return lang === 'es' ? 'veces' : 'times';
  }
}
