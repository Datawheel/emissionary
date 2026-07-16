/** Name validation, generation, and claiming (spec §10). */
import { q } from './db';

export const ADJECTIVES = [
  'Curious', 'Bright', 'Swift', 'Quiet', 'Bold', 'Clever', 'Gentle', 'Lucky',
  'Mighty', 'Nimble', 'Proud', 'Rapid', 'Sunny', 'Brave', 'Calm', 'Eager',
  'Fuzzy', 'Jolly', 'Keen', 'Lively', 'Merry', 'Noble', 'Plucky', 'Spry',
];

export const ANIMALS = [
  'Otter', 'Falcon', 'Panda', 'Lynx', 'Dolphin', 'Badger', 'Heron', 'Ibex',
  'Jackal', 'Koala', 'Lemur', 'Marmot', 'Narwhal', 'Ocelot', 'Puffin', 'Quokka',
  'Raccoon', 'Seal', 'Tapir', 'Urchin', 'Vulture', 'Wombat', 'Yak', 'Zebra',
];

export function generateName(rand: () => number = Math.random): string {
  const a = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(rand() * ANIMALS.length)];
  return `${a}${b}`;
}

/** Profanity/impersonation blocklist — substring match, case-insensitive. */
const BLOCKLIST = [
  'admin', 'moderator', 'official', 'oecworld', 'anthropic',
  'fuck', 'shit', 'cunt', 'nigg', 'fagg', 'rape', 'hitler', 'nazi',
  'puta', 'mierda', 'polla', 'joder', 'gilipollas',
];

export function validateName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().normalize('NFC');
  const codepoints = [...name];
  if (codepoints.length < 3 || codepoints.length > 20) return { ok: false, error: 'name must be 3–20 characters' };
  if (/[\n\r\t<>@#]/.test(name)) return { ok: false, error: 'name contains invalid characters' };
  const lower = name.toLowerCase();
  // "oec" alone is impersonation-adjacent; allow it inside words (e.g. "Poec")? No: block prefix/exact.
  if (lower === 'oec' || lower.startsWith('oec ') || BLOCKLIST.some((b) => lower.includes(b))) {
    return { ok: false, error: 'name not allowed' };
  }
  return { ok: true, name };
}

export class NameError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const RENAME_COOLDOWN_DAYS = 30;

/**
 * Claim (or change) a leaderboard name: uniqueness by lower(name) with a
 * #NNNN discriminator appended when taken; one rename per 30 days.
 */
export async function claimName(
  playerId: string,
  raw: string,
): Promise<{ name: string; discriminator: number | null }> {
  const v = validateName(raw);
  if (!v.ok) throw new NameError(400, v.error);

  const player = (
    await q<{ name: string | null; renamed_at: Date | null }>(
      'SELECT name, renamed_at FROM players WHERE id = $1',
      [playerId],
    )
  )[0];
  if (!player) throw new NameError(401, 'no player');
  if (player.name && player.renamed_at) {
    const days = (Date.now() - player.renamed_at.getTime()) / 86_400_000;
    if (days < RENAME_COOLDOWN_DAYS) throw new NameError(429, 'rename allowed once per 30 days');
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const taken = await q<{ name_discriminator: number | null }>(
      'SELECT name_discriminator FROM players WHERE lower(name) = lower($1) AND id != $2',
      [v.name, playerId],
    );
    const discriminator = taken.length === 0 ? null : 1000 + Math.floor(Math.random() * 9000);
    if (discriminator != null && taken.some((t) => t.name_discriminator === discriminator)) continue;
    try {
      await q(
        `UPDATE players SET name = $1, name_discriminator = $2, is_anonymous = false,
                renamed_at = CASE WHEN name IS NOT NULL THEN now() ELSE renamed_at END
         WHERE id = $3`,
        [v.name, discriminator, playerId],
      );
      return { name: v.name, discriminator };
    } catch (err) {
      if ((err as { code?: string }).code === '23505') continue; // unique race — retry
      throw err;
    }
  }
  throw new NameError(409, 'could not allocate a unique name, try another');
}
