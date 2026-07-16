import { describe, expect, it } from 'vitest';
import { score, scoreBinary, shareSquare, signedLogError } from '@/lib/scoring';

describe('score', () => {
  it('gives 100 for an exact guess', () => {
    expect(score(42, 42)).toBe(100);
  });

  it('gives 100 anywhere within ±10%', () => {
    expect(score(110, 100)).toBe(100);
    expect(score(91, 100)).toBe(100);
  });

  it('gives ~73 for a 2x-off guess (design §1.4 corrected criterion)', () => {
    expect(score(200, 100)).toBe(73);
    expect(score(50, 100)).toBe(73);
  });

  it('gives 0 at 10x off in either direction', () => {
    expect(score(1000, 100)).toBe(0);
    expect(score(10, 100)).toBe(0);
    expect(score(5000, 100)).toBe(0); // beyond 10x stays 0
  });

  it('is symmetric in log space', () => {
    expect(score(300, 100)).toBe(score(100 / 3, 100));
  });

  it('throws on non-positive inputs', () => {
    expect(() => score(0, 100)).toThrow();
    expect(() => score(100, -1)).toThrow();
  });
});

describe('signedLogError', () => {
  it('is positive for overestimates, negative for underestimates', () => {
    expect(signedLogError(200, 100)).toBeCloseTo(Math.log10(2));
    expect(signedLogError(50, 100)).toBeCloseTo(-Math.log10(2));
  });
});

describe('scoreBinary', () => {
  it('gives 50 for correct, 0 for incorrect', () => {
    expect(scoreBinary(true)).toBe(50);
    expect(scoreBinary(false)).toBe(0);
  });
});

describe('shareSquare', () => {
  it('maps score bands to squares with inclusive lower bounds', () => {
    expect(shareSquare(100)).toBe('🟩');
    expect(shareSquare(90)).toBe('🟩');
    expect(shareSquare(89)).toBe('🟨');
    expect(shareSquare(70)).toBe('🟨');
    expect(shareSquare(69)).toBe('🟧');
    expect(shareSquare(40)).toBe('🟧');
    expect(shareSquare(39)).toBe('🟥');
    expect(shareSquare(0)).toBe('🟥');
  });
});
