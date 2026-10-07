import { NextRequest, NextResponse } from 'next/server';
import { currentPlayer } from '@/lib/player';
import { leaderboard } from '@/lib/leaderboard';
import { todayUtc } from '@/lib/daily-service';
import { limited } from '@/lib/ratelimit';

export async function GET(req: NextRequest) {
  const tooMany = limited(req, 'leaderboard', 60, 60 * 1000);
  if (tooMany) return tooMany;
  const player = await currentPlayer();
  const params = req.nextUrl.searchParams;
  const scopeParam = params.get('scope');
  const scope = scopeParam === 'daily' || scopeParam === 'days' ? scopeParam : 'alltime';
  const countryParam = params.get('country');
  const country = countryParam && /^[A-Z]{3}$/.test(countryParam) ? countryParam : undefined;
  const offset = Math.min(100_000, Math.max(0, Math.floor(Number(params.get('offset') ?? 0) || 0)));
  const page = await leaderboard(scope, player, { country, offset, date: todayUtc() });
  return NextResponse.json(page);
}
