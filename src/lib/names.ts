/** Server-side name claiming (spec §10). Pure helpers live in name-gen.ts. */
import { q } from './db';
import { validateName, type NameErrorCode } from './name-gen';

export { generateName, validateName } from './name-gen';

export class NameError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: NameErrorCode,
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
  if (!v.ok) throw new NameError(400, v.error, v.code);

  const player = (
    await q<{ name: string | null; renamed_at: Date | null }>(
      'SELECT name, renamed_at FROM players WHERE id = $1',
      [playerId],
    )
  )[0];
  if (!player) throw new NameError(401, 'no player', 'auth');
  if (player.name && player.renamed_at) {
    const days = (Date.now() - player.renamed_at.getTime()) / 86_400_000;
    if (days < RENAME_COOLDOWN_DAYS) throw new NameError(429, 'rename allowed once per 30 days', 'cooldown');
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
  throw new NameError(409, 'could not allocate a unique name, try another', 'taken');
}
