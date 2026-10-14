import { afterEach, describe, expect, it, vi } from 'vitest';
import { oecScoreUrl, postOecScore, type OecScorePayload } from '@/lib/oec-score';

const payload: OecScorePayload = {
  game: 'emissionary',
  meta: { mode: 'daily', userId: 'oec-1' },
  answer: { date: '2026-10-14', country: 'FRA' },
  submission: { scores: [50, 100, 80, 40, 90], total: 360 },
  won: true,
};

afterEach(() => {
  delete process.env.OEC_SCORE_URL;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('oecScoreUrl', () => {
  it('stays off unless configured, and production defaults to the OEC endpoint', () => {
    delete process.env.OEC_SCORE_URL;
    expect(oecScoreUrl()).toBeNull();
    vi.stubEnv('NODE_ENV', 'production');
    expect(oecScoreUrl()).toBe('https://oec.world/api/games/score');
    vi.stubEnv('OEC_SCORE_URL', 'off');
    expect(oecScoreUrl()).toBeNull();
    vi.stubEnv('OEC_SCORE_URL', 'https://scores.example/api/games/score');
    expect(oecScoreUrl()).toBe('https://scores.example/api/games/score');
  });
});

describe('postOecScore', () => {
  it('POSTs the Tradle-shaped body and ignores a failed response', async () => {
    process.env.OEC_SCORE_URL = 'https://oec.example/api/games/score';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('no', { status: 502 }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await postOecScore(payload);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oec.example/api/games/score');
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(init?.body))).toEqual(payload);
    expect(error).toHaveBeenCalled();
  });

  it('does not call the network when the URL is off', async () => {
    process.env.OEC_SCORE_URL = 'off';
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await postOecScore(payload);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
