import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.EMISSIONARY_DATA_DIR = new URL('../fixtures/data', import.meta.url).pathname;
  process.env.DATABASE_URL = 'postgres://emissionary_test:emissionary_dev@localhost:5432/emissionary_test';
});

import { randomUUID } from 'node:crypto';
import { migrate } from '../../db/migrate';
import { syncItems } from '../../scripts/sync-items';
import { getPool, q } from '@/lib/db';
import { linkOecPlayer } from '@/lib/auth/oec-link';
import { createPlayer, type PlayerRow } from '@/lib/player';

const TEST_URL = process.env.DATABASE_URL!;

async function guess(playerId: string, score: number) {
  const roundId = randomUUID();
  await q(
    `INSERT INTO rounds (id, item_a, qty_a, item_b, round_type, difficulty)
     VALUES ($1, 'hairdryer', 10, 'fridge', 'quant', 1)`,
    [roundId],
  );
  await q(
    `INSERT INTO guesses (id, player_id, round_id, country, guess, truth, score)
     VALUES ($1, $2, $3, 'FRA', 1, 1, $4)`,
    [randomUUID(), playerId, roundId, score],
  );
}

const row = async (id: string) =>
  (await q<PlayerRow & { oec_user_id: string | null }>('SELECT * FROM players WHERE id = $1', [id]))[0];

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

describe('linkOecPlayer', () => {
  it('is pending when there is no player and no linked account', async () => {
    expect(await linkOecPlayer(null, { sub: 'u1', name: 'Ada Lovelace' })).toEqual({ status: 'pending' });
  });

  it('binds the anonymous player to the account and seeds the OEC name', async () => {
    const anon = await createPlayer('FRA');
    const res = await linkOecPlayer(anon, { sub: 'u1', name: 'Ada Lovelace' });
    expect(res).toMatchObject({ status: 'linked', playerId: anon.id, changed: false, seeded: true, name: 'Ada Lovelace' });
    const p = await row(anon.id);
    expect(p.oec_user_id).toBe('u1');
    expect(p.name).toBe('Ada Lovelace');
    expect(p.is_anonymous).toBe(false);
  });

  it('leaves the player unnamed when the OEC name is not usable', async () => {
    const anon = await createPlayer('FRA');
    const res = await linkOecPlayer(anon, { sub: 'u1', name: '#@' });
    expect(res).toMatchObject({ status: 'linked', name: null });
    expect((await row(anon.id)).name).toBeNull();
  });

  it('adopts the existing account player on a fresh browser', async () => {
    const first = await createPlayer('FRA');
    await linkOecPlayer(first, { sub: 'u1', name: 'Ada Lovelace' });
    const res = await linkOecPlayer(null, { sub: 'u1', name: 'Ada Lovelace' });
    expect(res).toMatchObject({ status: 'linked', playerId: first.id, changed: true, name: 'Ada Lovelace' });
  });

  it('merges an anonymous player into the existing account player', async () => {
    const account = await createPlayer('FRA');
    await linkOecPlayer(account, { sub: 'u1', name: 'Ada Lovelace' });
    await guess(account.id, 10);
    const anon = await createPlayer('ESP');
    await guess(anon.id, 90);

    const res = await linkOecPlayer(anon, { sub: 'u1', name: 'Ada Lovelace' });
    expect(res).toMatchObject({ status: 'linked', playerId: account.id, changed: true });
    expect(await row(anon.id)).toBeUndefined();
    const [{ n }] = await q<{ n: string }>('SELECT count(*)::text AS n FROM guesses WHERE player_id = $1', [account.id]);
    expect(n).toBe('2');
  });

  it('does not merge a player bound to another account', async () => {
    const a = await createPlayer('FRA');
    await linkOecPlayer(a, { sub: 'u1', name: 'Ada Lovelace' });
    await guess(a.id, 10);

    const res = await linkOecPlayer(a, { sub: 'u2', name: 'Grace Hopper' });
    expect(res).toMatchObject({ status: 'linked', changed: true, name: 'Grace Hopper' });
    if (res.status !== 'linked') throw new Error('unreachable');
    expect(res.playerId).not.toBe(a.id);
    const [{ n }] = await q<{ n: string }>('SELECT count(*)::text AS n FROM guesses WHERE player_id = $1', [a.id]);
    expect(n).toBe('1'); // u1 keeps their history
    expect((await row(res.playerId)).country).toBe('FRA');
  });

  it('keeps an existing leaderboard name instead of overwriting it', async () => {
    const anon = await createPlayer('FRA');
    await q("UPDATE players SET name = 'Chosen', is_anonymous = false WHERE id = $1", [anon.id]);
    const res = await linkOecPlayer({ ...anon, name: 'Chosen' }, { sub: 'u1', name: 'Ada Lovelace' });
    expect(res).toMatchObject({ status: 'linked', seeded: false, name: 'Chosen' });
  });
});
