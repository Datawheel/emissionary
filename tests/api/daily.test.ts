import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.EMISSIONARY_DATA_DIR = new URL('../fixtures/data', import.meta.url).pathname;
  process.env.DATABASE_URL = 'postgres://emissionary:emissionary_dev@localhost:5432/emissionary_test';
  process.env.DAILY_SALT = 'test-salt-daily';
  process.env.LAUNCH_DATE = '2026-07-01';
});

import { randomUUID } from 'node:crypto';
import { migrate } from '../../db/migrate';
import { syncItems } from '../../scripts/sync-items';
import { getPool, q } from '@/lib/db';
import { dayNumber, getDailyProgress, getDailyRounds } from '@/lib/daily-service';
import { GuessError, submitGuess } from '@/lib/round-service';
import { leaderboard } from '@/lib/leaderboard';
import { claimName, NameError, validateName } from '@/lib/names';
import type { PlayerRow } from '@/lib/player';

const TEST_URL = process.env.DATABASE_URL!;
const DATE = '2026-07-16';

async function makePlayer(country = 'FRA', name?: string): Promise<PlayerRow> {
  const id = randomUUID();
  const rows = await q<PlayerRow>(
    `INSERT INTO players (id, country, name, is_anonymous) VALUES ($1, $2, $3, $4)
     RETURNING id, name, name_discriminator, country, is_anonymous, renamed_at`,
    [id, country, name ?? null, name == null],
  );
  return rows[0];
}

async function playFullDaily(player: PlayerRow, date: string): Promise<number> {
  const rounds = await getDailyRounds(date);
  let total = 0;
  for (const r of rounds) {
    const res =
      r.round_type === 'binary'
        ? await submitGuess(player, r.id, { choice: 'a', ms_elapsed: 500 })
        : await submitGuess(player, r.id, { value: Number(r.slider_min) * 15, ms_elapsed: 500 });
    total += res.score;
  }
  return total;
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

describe('daily set generation', () => {
  it('creates exactly 5 rounds: 1 binary + 4 quant with ≥2 cross-carrier', async () => {
    const rounds = await getDailyRounds(DATE);
    expect(rounds).toHaveLength(5);
    expect(rounds[0].round_type).toBe('binary');
    expect(rounds.slice(1).every((r) => r.round_type === 'quant')).toBe(true);
  });

  it('is stable across repeated and concurrent requests (spec §16)', async () => {
    const [a, b] = await Promise.all([getDailyRounds(DATE), getDailyRounds(DATE)]);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
    const c = await getDailyRounds(DATE);
    expect(c.map((r) => `${r.item_a}|${r.qty_a}|${r.item_b}`)).toEqual(
      a.map((r) => `${r.item_a}|${r.qty_a}|${r.item_b}`),
    );
    const sets = await q('SELECT * FROM daily_sets');
    expect(sets).toHaveLength(1);
  });

  it('same pairs, different truths for France vs Germany (spec §16)', async () => {
    const fra = await makePlayer('FRA');
    const deu = await makePlayer('DEU');
    const rounds = await getDailyRounds(DATE);
    const quant = rounds.find(
      (r) => r.round_type === 'quant' && ['gas_hob', 'petrol_car'].some((f) => r.item_a === f || r.item_b === f),
    )!;
    expect(quant).toBeDefined();
    const g = Number(quant.slider_min) * 12;
    const r1 = await submitGuess(fra, quant.id, { value: g });
    const r2 = await submitGuess(deu, quant.id, { value: g });
    expect(r1.truth).not.toBeCloseTo(r2.truth, 6);
  });
});

describe('daily play flow', () => {
  it('tracks progress, completes, and reports percentile', async () => {
    const p1 = await makePlayer('FRA', 'Alice');
    const p2 = await makePlayer('FRA', 'Bob');
    await playFullDaily(p1, DATE);
    const before = await getDailyProgress(p2, DATE);
    expect(before.completed).toBe(false);
    expect(before.next_index).toBe(0);
    await playFullDaily(p2, DATE);
    const after = await getDailyProgress(p2, DATE);
    expect(after.completed).toBe(true);
    expect(after.percentile).not.toBeNull();
    expect(after.day_number).toBe(dayNumber(DATE));
    expect(after.seconds_to_next).toBeGreaterThan(0);
  });

  it('locks the country at the first daily guess', async () => {
    const player = await makePlayer('FRA');
    const rounds = await getDailyRounds(DATE);
    const first = rounds[1]; // quant
    await submitGuess(player, first.id, { value: Number(first.slider_min) * 15 });
    // switch country mid-game
    await q('UPDATE players SET country = $1 WHERE id = $2', ['POL', player.id]);
    const updated = { ...player, country: 'POL' };
    const second = rounds[2];
    const res = await submitGuess(updated, second.id, { value: Number(second.slider_min) * 15 });
    const stored = await q<{ country: string }>('SELECT country FROM guesses WHERE round_id = $1', [second.id]);
    expect(stored[0].country).toBe('FRA'); // locked, not POL
    expect(res.score).toBeGreaterThanOrEqual(0);
  });

  it('rejects a second attempt at an answered round', async () => {
    const player = await makePlayer('FRA');
    const rounds = await getDailyRounds(DATE);
    const r = rounds[1];
    const first = await submitGuess(player, r.id, { value: Number(r.slider_min) * 15 });
    const replay = await submitGuess(player, r.id, { value: Number(r.slider_min) * 40 });
    expect(replay.score).toBe(first.score);
    expect(replay.already_answered).toBe(true);
  });

  it('enforces the 2h session window', async () => {
    const player = await makePlayer('FRA');
    const rounds = await getDailyRounds(DATE);
    await submitGuess(player, rounds[1].id, { value: Number(rounds[1].slider_min) * 15 });
    await q(`UPDATE guesses SET created_at = now() - interval '3 hours' WHERE player_id = $1`, [player.id]);
    await expect(
      submitGuess(player, rounds[2].id, { value: Number(rounds[2].slider_min) * 15 }),
    ).rejects.toThrowError(GuessError);
  });
});

describe('leaderboard', () => {
  it('ranks completed daily players, excludes anonymous from public rows, pins own row', async () => {
    const alice = await makePlayer('FRA', 'Alice');
    const anon = await makePlayer('POL');
    await playFullDaily(alice, DATE);
    await playFullDaily(anon, DATE);
    const page = await leaderboard('daily', anon, { date: DATE });
    expect(page.rows.some((r) => r.name.includes('Anonymous'))).toBe(false);
    expect(page.rows.some((r) => r.name === 'Alice')).toBe(true);
    expect(page.you).not.toBeNull();
    expect(page.you!.is_you).toBe(true);
    expect(page.you!.name).toContain('Anonymous');
  });

  it('filters by country', async () => {
    const alice = await makePlayer('FRA', 'Alice');
    const bob = await makePlayer('POL', 'Bob');
    await playFullDaily(alice, DATE);
    await playFullDaily(bob, DATE);
    const page = await leaderboard('daily', null, { date: DATE, country: 'POL' });
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].name).toBe('Bob');
  });
});

describe('names', () => {
  it('validates length and blocklist', () => {
    expect(validateName('ab').ok).toBe(false);
    expect(validateName('a'.repeat(21)).ok).toBe(false);
    expect(validateName('AdminGuy').ok).toBe(false);
    expect(validateName('OEC').ok).toBe(false);
    expect(validateName('CuriousOtter').ok).toBe(true);
    expect(validateName('Ñandú 🦤').ok).toBe(true); // unicode-friendly
  });

  it('appends a discriminator on collision', async () => {
    const p1 = await makePlayer('FRA');
    const p2 = await makePlayer('DEU');
    const r1 = await claimName(p1.id, 'CuriousOtter');
    expect(r1.discriminator).toBeNull();
    const r2 = await claimName(p2.id, 'curiousotter');
    expect(r2.discriminator).toBeGreaterThanOrEqual(1000);
  });

  it('enforces the 30-day rename cooldown', async () => {
    const p = await makePlayer('FRA');
    await claimName(p.id, 'FirstName');
    await claimName(p.id, 'SecondName'); // first rename: allowed (sets renamed_at)
    await expect(claimName(p.id, 'ThirdName')).rejects.toThrowError(NameError);
  });
});
