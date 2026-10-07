import { NextResponse, type NextRequest } from 'next/server';
import { limited } from '@/lib/ratelimit';
import { currentPlayer } from '@/lib/player';
import { getDailyProgress, todayUtc } from '@/lib/daily-service';

export async function GET(req: NextRequest) {
  const tooMany = limited(req, 'daily', 60, 60 * 1000);
  if (tooMany) return tooMany;
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const progress = await getDailyProgress(player, todayUtc());
  return NextResponse.json(progress);
}
