import { NextResponse } from 'next/server';
import { currentPlayer } from '@/lib/player';
import { createFreeplayRound, freeplayTotals } from '@/lib/round-service';

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const round = await createFreeplayRound(player);
  const totals = await freeplayTotals(player.id);
  return NextResponse.json({ round, totals });
}
