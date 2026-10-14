import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { loadCountryFactors } from '@/lib/data';
import { dealGuestFreeplay } from '@/lib/guest';
import { limited } from '@/lib/ratelimit';

const bodySchema = z.object({
  country: z.string().length(3),
  pairs: z.array(z.string().regex(/^[a-z0-9_|]+$/i).max(80)).max(40).default([]),
  scores: z.array(z.number().min(0).max(100)).max(200).default([]),
  best: z.number().int().min(0).max(10_000).default(0),
});

/**
 * POST /api/guest/round
 * Deals a free-play round without creating a player or writing a row.
 */
export async function POST(req: NextRequest) {
  const tooMany = limited(req, 'guest-round', 60, 60 * 1000);
  if (tooMany) return tooMany;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const country = parsed.data.country.toUpperCase();
  if (!loadCountryFactors().some((c) => c.iso3 === country)) {
    return NextResponse.json({ error: 'invalid country' }, { status: 400 });
  }
  try {
    const dealt = dealGuestFreeplay(country, parsed.data.pairs, parsed.data.scores, parsed.data.best);
    return NextResponse.json(dealt);
  } catch {
    return NextResponse.json({ error: 'could not deal a round' }, { status: 400 });
  }
}
