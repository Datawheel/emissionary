import { NextResponse, type NextRequest } from 'next/server';
import { loadCountryFactors } from '@/lib/data';
import { getDailyRounds, todayUtc } from '@/lib/daily-service';
import { guestDailyFromRounds } from '@/lib/guest';
import { limited } from '@/lib/ratelimit';

/**
 * GET /api/guest/daily?country=FRA
 * Today's puzzle with no player attached. The shared daily set is game content,
 * not a record of this visitor.
 */
export async function GET(req: NextRequest) {
  const tooMany = limited(req, 'guest-daily', 30, 60 * 1000);
  if (tooMany) return tooMany;
  const country = (req.nextUrl.searchParams.get('country') ?? '').toUpperCase();
  if (!loadCountryFactors().some((c) => c.iso3 === country)) {
    return NextResponse.json({ error: 'invalid country' }, { status: 400 });
  }
  const date = todayUtc();
  const rounds = await getDailyRounds(date);
  return NextResponse.json(guestDailyFromRounds(rounds, country, date));
}
