/** Pure name generation + validation (client-safe; no server imports). */

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
  if (lower === 'oec' || lower.startsWith('oec ') || BLOCKLIST.some((b) => lower.includes(b))) {
    return { ok: false, error: 'name not allowed' };
  }
  return { ok: true, name };
}
