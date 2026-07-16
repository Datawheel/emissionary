import { NextResponse } from 'next/server';
import { currentPlayer } from '@/lib/player';
import { getDailyProgress, todayUtc } from '@/lib/daily-service';

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const progress = await getDailyProgress(player, todayUtc());
  return NextResponse.json(progress);
}
