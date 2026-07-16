import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentPlayer } from '@/lib/player';
import { claimName, NameError } from '@/lib/names';

const bodySchema = z.object({ name: z.string().min(1).max(64) });

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  try {
    const result = await claimName(player.id, parsed.data.name);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NameError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
