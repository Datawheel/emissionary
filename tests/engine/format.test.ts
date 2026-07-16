import { describe, expect, it } from 'vitest';
import { formatCO2, formatQty, toSigFigs } from '@/lib/format';

describe('toSigFigs', () => {
  it('rounds to 2 significant figures', () => {
    expect(toSigFigs(14.36)).toBe(14);
    expect(toSigFigs(0.09341)).toBe(0.093);
    expect(toSigFigs(1867)).toBe(1900);
    expect(toSigFigs(0)).toBe(0);
  });
});

describe('formatQty', () => {
  it('shows sub-minute times in seconds', () => {
    expect(formatQty(0.5, 'minutes', 'en')).toBe('30 s');
  });

  it('shows short times in minutes', () => {
    expect(formatQty(45, 'minutes', 'en')).toBe('45 min');
  });

  it('promotes long minute values to hours', () => {
    expect(formatQty(150, 'minutes', 'en')).toBe('2.5 h');
    expect(formatQty(840, 'minutes', 'en')).toBe('14 h');
  });

  it('promotes very long durations to days and months', () => {
    expect(formatQty(72, 'hours', 'en')).toBe('3 days');
    expect(formatQty(24 * 61, 'hours', 'en')).toBe('2 months');
    expect(formatQty(72, 'hours', 'es')).toBe('3 días');
  });

  it('formats km and liters', () => {
    expect(formatQty(10, 'km', 'en')).toBe('10 km');
    expect(formatQty(1.5, 'liters_boiled', 'en')).toBe('1.5 L');
  });

  it('formats events as a bare multiplier for the caller to label', () => {
    expect(formatQty(3, 'events', 'en')).toBe('3×');
  });
});

describe('formatCO2', () => {
  it('uses grams below 1000', () => {
    expect(formatCO2(850, 'en')).toBe('850 g CO₂');
    expect(formatCO2(4.2, 'en')).toBe('4.2 g CO₂');
  });

  it('uses kilograms at and above 1000 g', () => {
    expect(formatCO2(1400, 'en')).toBe('1.4 kg CO₂');
    expect(formatCO2(23000, 'en')).toBe('23 kg CO₂');
  });
});
