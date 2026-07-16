import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPlayer, currentPlayer, setPlayerCookie } from '@/lib/player';
import { loadCountryFactors } from '@/lib/data';
import { q } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/ratelimit';

const bodySchema = z.object({ country: z.string().length(3) });

function validCountry(iso3: string): boolean {
  return loadCountryFactors().some((c) => c.iso3 === iso3);
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`player:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validCountry(parsed.data.country)) {
    return NextResponse.json({ error: 'invalid country' }, { status: 400 });
  }
  const existing = await currentPlayer();
  if (existing) {
    return NextResponse.json({ player_id: existing.id, country: existing.country, name: existing.name });
  }
  const player = await createPlayer(parsed.data.country);
  await setPlayerCookie(player.id);
  return NextResponse.json({ player_id: player.id, country: player.country, name: player.name }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !validCountry(parsed.data.country)) {
    return NextResponse.json({ error: 'invalid country' }, { status: 400 });
  }
  await q('UPDATE players SET country = $1 WHERE id = $2', [parsed.data.country, player.id]);
  return NextResponse.json({ player_id: player.id, country: parsed.data.country });
}
