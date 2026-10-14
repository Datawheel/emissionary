import { describe, expect, it } from 'vitest';
import { dealGuestFreeplay, scoreGuest, signGuestToken, verifyGuestToken, type GuestToken } from '@/lib/guest';

describe('guest rounds', () => {
  it('deals a round whose token does not carry the answer', () => {
    const dealt = dealGuestFreeplay('FRA', [], [], 0);
    expect(dealt.round.item_a.id).toBeTruthy();
    expect(dealt.round).not.toHaveProperty('truth');
    const token = verifyGuestToken(dealt.token);
    expect(token).not.toBeNull();
    expect(JSON.stringify(token)).not.toMatch(/truth|grams|grid_gco2|power_watts/);
    expect(token?.country).toBe('FRA');
  });

  it('scores a signed round without persisting it', () => {
    const dealt = dealGuestFreeplay('DEU', [], [], 0);
    const token = verifyGuestToken(dealt.token)!;
    const input =
      dealt.round.round_type === 'quant'
        ? { value: dealt.round.slider_min }
        : { choice: 'a' as const };
    const reveal = scoreGuest(token, input, [], 0);
    expect(reveal.score).toBeGreaterThanOrEqual(0);
    expect(reveal.score).toBeLessThanOrEqual(100);
    expect(reveal.truth).toEqual(expect.any(Number));
    expect(reveal.totals.run.rounds).toBe(1);
  });

  it('rejects a tampered or expired token', () => {
    const dealt = dealGuestFreeplay('FRA', [], [], 0);
    const [body, mac] = dealt.token.split('.');
    expect(verifyGuestToken(`${body.slice(0, -2)}aa.${mac}`)).toBeNull();
    const forged: GuestToken = { ...(verifyGuestToken(dealt.token) as GuestToken), exp: Date.now() - 1000 };
    expect(verifyGuestToken(signGuestToken(forged))).toBeNull();
  });
});
