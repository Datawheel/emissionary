import { NextRequest, NextResponse } from 'next/server';
import { currentPlayer } from '@/lib/player';
import { leaderboard } from '@/lib/leaderboard';
import { todayUtc } from '@/lib/daily-service';

export async function GET(req: NextRequest) {
  const player = await currentPlayer();
  const params = req.nextUrl.searchParams;
  const scopeParam = params.get('scope');
  const scope = scopeParam === 'weekly' || scopeParam === 'alltime' ? scopeParam : 'daily';
  const country = params.get('country') ?? undefined;
  const offset = Number(params.get('offset') ?? 0) || 0;
  const page = await leaderboard(scope, player, { country, offset, date: todayUtc() });
  return NextResponse.json(page);
}
