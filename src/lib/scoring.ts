/**
 * Scoring (spec §7): symmetric in log space. 100 points within ±10% of
 * truth, linear decay in |log10(guess/truth)| to 0 at 10× off either way.
 */
const TOLERANCE = Math.log10(1.1);

export function signedLogError(guess: number, truth: number): number {
  if (!(guess > 0) || !(truth > 0)) throw new Error('guess and truth must be positive');
  return Math.log10(guess / truth);
}

export function score(guess: number, truth: number): number {
  const e = Math.abs(signedLogError(guess, truth));
  if (e <= TOLERANCE) return 100;
  return Math.max(0, Math.round((100 * (1 - e)) / (1 - TOLERANCE)));
}

export function scoreBinary(correct: boolean): number {
  return correct ? 50 : 0;
}

export function shareSquare(s: number): '🟩' | '🟨' | '🟧' | '🟥' {
  if (s >= 90) return '🟩';
  if (s >= 70) return '🟨';
  if (s >= 40) return '🟧';
  return '🟥';
}
