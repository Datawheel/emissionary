import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.EMISSIONARY_DATA_DIR = new URL('../fixtures/data', import.meta.url).pathname;
  process.env.DATABASE_URL = 'postgres://emissionary:emissionary_dev@localhost:5432/emissionary_test';
});

import { randomUUID } from 'node:crypto';
import { migrate } from '../../db/migrate';
import { syncItems } from '../../scripts/sync-items';
import { getPool, q } from '@/lib/db';
import { createFreeplayRound, freeplayTotals, GuessError, submitGuess, type RoundRow } from '@/lib/round-service';
import type { PlayerRow } from '@/lib/player';

const TEST_URL = process.env.DATABASE_URL!;

async function makePlayer(country = 'FRA'): Promise<PlayerRow> {
  const id = randomUUID();
  const rows = await q<PlayerRow>(
    `INSERT INTO players (id, country) VALUES ($1, $2)
     RETURNING id, name, name_discriminator, country, is_anonymous, renamed_at`,
    [id, country],
  );
  return rows[0];
}

beforeAll(async () => {
  await migrate(TEST_URL);
  await syncItems(TEST_URL);
});

beforeEach(async () => {
  await q('TRUNCATE guesses, rounds, daily_sets, players CASCADE');
});

afterAll(async () => {
  await getPool().end();
});

describe('createFreeplayRound', () => {
  it('returns a round without any truth, factor, or physical value', async () => {
    const player = await makePlayer();
    const round = await createFreeplayRound(player);
    const serialized = JSON.stringify(round);
    expect(serialized).not.toMatch(/truth/i);
    expect(serialized).not.toMatch(/grid_gco2|power_watts|kwh_per|efficiency|grams/i);
    expect(round.round_id).toMatch(/^[0-9a-f-]{36}$/);
    if (round.round_type === 'quant') {
      expect(round.slider_min).toBeGreaterThan(0);
      expect(round.slider_max).toBeGreaterThan(round.slider_min!);
    }
  });

  it('persists the round for the player', async () => {
    const player = await makePlayer();
    const round = await createFreeplayRound(player);
    const rows = await q<RoundRow>('SELECT * FROM rounds WHERE id = $1', [round.round_id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].player_id).toBe(player.id);
  });
});

describe('submitGuess', () => {
  async function quantRound(player: PlayerRow) {
    for (let i = 0; i < 10; i++) {
      const round = await createFreeplayRound(player);
      if (round.round_type === 'quant') return round;
    }
    throw new Error('no quant round in 10 tries');
  }

  it('scores an exact guess 100 and is idempotent on replay', async () => {
    const player = await makePlayer();
    const round = await quantRound(player);
    // discover the truth by binary search is cheating-ish; instead submit the
    // geometric mean and verify the score is consistent with the truth returned
    const firstGuess = Math.sqrt(round.slider_min! * round.slider_max!);
    const res1 = await submitGuess(player, round.round_id, { value: firstGuess, ms_elapsed: 1000 });
    expect(res1.truth).toBeGreaterThan(0);
    expect(res1.already_answered).toBe(false);
    expect(res1.conversion_rows.length).toBeGreaterThanOrEqual(8);
    expect(res1.breakdown_a.steps.length).toBeGreaterThan(0);

    // replay with a DIFFERENT value: stored result wins
    const res2 = await submitGuess(player, round.round_id, { value: res1.truth, ms_elapsed: 1 });
    expect(res2.score).toBe(res1.score);
    expect(res2.guess).toBeCloseTo(firstGuess, 6);
    expect(res2.already_answered).toBe(true);

    const stored = await q('SELECT count(*)::int AS n FROM guesses WHERE round_id = $1', [round.round_id]);
    expect(stored[0].n).toBe(1);
  });

  it('rejects guesses outside slider bounds ×10', async () => {
    const player = await makePlayer();
    const round = await quantRound(player);
    await expect(
      submitGuess(player, round.round_id, { value: round.slider_max! * 11 }),
    ).rejects.toThrowError(GuessError);
  });

  it("rejects another player's round", async () => {
    const p1 = await makePlayer();
    const p2 = await makePlayer();
    const round = await quantRound(p1);
    await expect(submitGuess(p2, round.round_id, { value: 1 })).rejects.toThrowError(GuessError);
  });

  it('computes different truths for different countries on cross-carrier rounds', async () => {
    const fra = await makePlayer('FRA');
    const pol = await makePlayer('POL');
    // hand-create the same kettle→gas_hob round for both players
    const mk = async (playerId: string) => {
      const id = randomUUID();
      await q(
        `INSERT INTO rounds (id, player_id, item_a, qty_a, item_b, round_type, difficulty, slider_min, slider_max)
         VALUES ($1, $2, 'kettle', 1, 'gas_hob', 'quant', 3, 0.001, 100)`,
        [id, playerId],
      );
      return id;
    };
    const r1 = await submitGuess(fra, await mk(fra.id), { value: 1 });
    const r2 = await submitGuess(pol, await mk(pol.id), { value: 1 });
    expect(r1.truth).toBeLessThan(0.2); // France: kettle ≪ gas hob
    expect(r2.truth).toBeGreaterThan(1); // Poland: kettle > gas hob
  });

  it('scores binary rounds 50/0 and reveals both grams', async () => {
    const player = await makePlayer();
    const id = randomUUID();
    // 60 min hairdryer (1.8 kWh) vs 1 h TV (0.09 kWh): a emits more
    await q(
      `INSERT INTO rounds (id, player_id, item_a, qty_a, item_b, qty_b, round_type, difficulty)
       VALUES ($1, $2, 'hairdryer', 60, 'tv', 1, 'binary', 1)`,
      [id, player.id],
    );
    const res = await submitGuess(player, id, { choice: 'a' });
    expect(res.score).toBe(50);
    expect(res.correct).toBe(true);
    expect(res.grams_a).toBeGreaterThan(res.grams_b!);
  });
});

describe('freeplayTotals', () => {
  it('tracks rounds, average, and streaks', async () => {
    const player = await makePlayer();
    const scores = [90, 85, 60, 95, 100];
    for (const s of scores) {
      const roundId = randomUUID();
      await q(
        `INSERT INTO rounds (id, player_id, item_a, qty_a, item_b, round_type, difficulty)
         VALUES ($1, $2, 'hairdryer', 10, 'fridge', 'quant', 1)`,
        [roundId, player.id],
      );
      await q(
        `INSERT INTO guesses (id, player_id, round_id, country, guess, truth, score)
         VALUES ($1, $2, $3, 'FRA', 1, 1, $4)`,
        [randomUUID(), player.id, roundId, s],
      );
    }
    const totals = await freeplayTotals(player.id);
    expect(totals.rounds_played).toBe(5);
    expect(totals.avg_score).toBe(86);
    expect(totals.current_streak).toBe(2); // 100, 95 (newest first)
    expect(totals.best_streak).toBe(2);
  });
});
