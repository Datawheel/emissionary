import { NextResponse, type NextRequest } from 'next/server';
import { limited } from '@/lib/ratelimit';
import { currentPlayer } from '@/lib/player';
import { createFreeplayRound, freeplayTotals } from '@/lib/round-service';

export async function GET(req: NextRequest) {
  const tooMany = limited(req, 'next', 60, 60 * 1000);
  if (tooMany) return tooMany;
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const round = await createFreeplayRound(player);
  const totals = await freeplayTotals(player.id);
  return NextResponse.json({ round, totals });
}
