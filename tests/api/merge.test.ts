import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.EMISSIONARY_DATA_DIR = new URL('../fixtures/data', import.meta.url).pathname;
  process.env.DATABASE_URL = 'postgres://emissionary_test:emissionary_dev@localhost:5432/emissionary_test';
});

import { randomUUID } from 'node:crypto';
import { migrate } from '../../db/migrate';
import { syncItems } from '../../scripts/sync-items';
import { getPool, q } from '@/lib/db';
import { guessCount, mergePlayers } from '@/lib/auth/provider';

const TEST_URL = process.env.DATABASE_URL!;

async function player(): Promise<string> {
  const id = randomUUID();
  await q('INSERT INTO players (id, country) VALUES ($1, $2)', [id, 'FRA']);
  return id;
}

async function roundWithGuess(playerId: string, roundId: string, score: number, createdAt: string) {
  await q(
    `INSERT INTO rounds (id, item_a, qty_a, item_b, round_type, difficulty)
     VALUES ($1, 'hairdryer', 10, 'fridge', 'quant', 1)
     ON CONFLICT (id) DO NOTHING`,
    [roundId],
  );
  await q(
    `INSERT INTO guesses (id, player_id, round_id, country, guess, truth, score, created_at)
     VALUES ($1, $2, $3, 'FRA', 1, 1, $4, $5)`,
    [randomUUID(), playerId, roundId, score, createdAt],
  );
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

describe('mergePlayers (spec §15.4)', () => {
  it('carries over history and keeps the earlier guess on conflict', async () => {
    const anon = await player();
    const linked = await player();
    const shared = randomUUID();
    const anonOnly = randomUUID();
    // anon answered `shared` EARLIER than linked, plus one round only anon played
    await roundWithGuess(anon, shared, 80, '2026-07-01T10:00:00Z');
    await roundWithGuess(linked, shared, 20, '2026-07-02T10:00:00Z');
    await roundWithGuess(anon, anonOnly, 95, '2026-07-03T10:00:00Z');

    await mergePlayers(anon, linked);

    expect(await guessCount(linked)).toBe(2);
    expect(await guessCount(anon)).toBe(0);
    const players = await q('SELECT id FROM players WHERE id = $1', [anon]);
    expect(players).toHaveLength(0);
    const kept = await q<{ score: number }>(
      'SELECT score FROM guesses WHERE player_id = $1 AND round_id = $2',
      [linked, shared],
    );
    expect(kept[0].score).toBe(80); // the earlier guess won
  });
});
