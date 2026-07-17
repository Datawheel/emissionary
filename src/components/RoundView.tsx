'use client';

/**
 * The round play/reveal area shared by Free Play and the Daily Game.
 * After the reveal, emissions appear in large type ON the product cards
 * (not in a separate section), keeping the UI clean.
 */
import type { ClientRound, GuessResponse } from '@/lib/api-types';
import type { Lang } from '@/lib/types';
import { L, t } from '@/lib/i18n';
import { formatCO2 } from '@/lib/format';
import LogSlider from './LogSlider';
import RevealPanel, { clueLabel, qtyLabel } from './RevealPanel';

export default function RoundView({
  round,
  phase,
  reveal,
  guess,
  onGuessChange,
  onBinaryChoice,
  flag,
  lang,
}: {
  round: ClientRound;
  phase: 'guess' | 'reveal';
  reveal: GuessResponse | null;
  guess: number | null;
  onGuessChange: (v: number) => void;
  onBinaryChoice: (choice: 'a' | 'b') => void;
  flag: string;
  lang: Lang;
}) {
  const isBinary = round.round_type === 'binary';
  const revealed = phase === 'reveal' && reveal != null;

  if (isBinary) {
    const winner: 'a' | 'b' | null = revealed ? (reveal.grams_a! > reveal.grams_b! ? 'a' : 'b') : null;
    return (
      <>
        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('which_emits_more', lang)}</p>
        <div className="binary-choice">
          {(['a', 'b'] as const).map((side) => {
            const item = side === 'a' ? round.item_a : round.item_b;
            const qty = side === 'a' ? round.qty_a : round.qty_b!;
            const grams = side === 'a' ? reveal?.grams_a : reveal?.grams_b;
            const picked = reveal?.choice === side;
            return (
              <button
                key={side}
                className="card item-card"
                aria-pressed={picked}
                disabled={revealed}
                onClick={() => onBinaryChoice(side)}
              >
                <div className="emoji" aria-hidden="true">
                  {item.emoji}
                </div>
                <div className="title">{clueLabel(qty, item, lang)}</div>
                {revealed && grams != null && (
                  <div className="co2-badge">
                    {formatCO2(grams, lang)}
                    <span className={`verdict ${winner === side ? 'lose' : 'win'}`} aria-hidden="true">
                      {winner === side ? '▲' : '▼'} {picked ? (reveal!.correct ? '✓' : '✗') : ''}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {revealed && (
          <div style={{ textAlign: 'center' }} aria-live="polite">
            <span className={`score-pill ${reveal!.correct ? 'good' : 'bad'}`}>
              {reveal!.correct ? '✓' : '✗'} +{reveal!.score} {t('points', lang)}
            </span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="card item-card">
        <div className="emoji" aria-hidden="true">
          {round.item_a.emoji}
        </div>
        <div className="title">
          {clueLabel(round.qty_a, round.item_a, lang)} <span aria-hidden="true">{flag}</span>
        </div>
        {revealed && <div className="co2-badge">{formatCO2(reveal!.breakdown_a.grams, lang)}</div>}
      </div>
      <p className="vs-divider">{t('equals_question', lang)}</p>
      <div className="card item-card target-card">
        <div className="emoji" aria-hidden="true">
          {round.item_b.emoji}
        </div>
        <div className="title">
          {revealed ? clueLabel(reveal!.truth, round.item_b, lang) : L(round.item_b.name, lang)}
        </div>
        {revealed && <div className="co2-badge">{formatCO2(reveal!.breakdown_b.grams, lang)}</div>}
      </div>
      {!revealed && (
        <div className="card slider-block">
          <p className="muted" style={{ textAlign: 'center', marginBottom: 4 }}>
            {t('how_many', lang)}
          </p>
          <LogSlider
            min={round.slider_min!}
            max={round.slider_max!}
            value={guess ?? Math.sqrt(round.slider_min! * round.slider_max!)}
            onChange={onGuessChange}
            unit={round.item_b.typical_unit}
            lang={lang}
            eventNoun={round.item_b.event_noun ? L(round.item_b.event_noun, lang) : undefined}
          />
          {guess == null && (
            <p className="muted" style={{ textAlign: 'center' }}>
              {t('move_slider_hint', lang)}
            </p>
          )}
        </div>
      )}
      {revealed && <RevealPanel data={reveal!} itemA={round.item_a} itemB={round.item_b} lang={lang} />}
    </>
  );
}
