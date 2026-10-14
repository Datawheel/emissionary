import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { scoreGuest, verifyGuestToken } from '@/lib/guest';
import { GuessError } from '@/lib/round-service';
import { limited } from '@/lib/ratelimit';

const bodySchema = z.object({
  token: z.string().min(1).max(4000),
  value: z.number().positive().optional(),
  choice: z.enum(['a', 'b']).optional(),
  scores: z.array(z.number().min(0).max(100)).max(200).default([]),
  best: z.number().int().min(0).max(10_000).default(0),
});

/**
 * POST /api/guest/guess
 * Scores a signed round and returns the reveal. Writes nothing.
 */
export async function POST(req: NextRequest) {
  const tooMany = limited(req, 'guest-guess', 60, 60 * 1000);
  if (tooMany) return tooMany;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const token = verifyGuestToken(parsed.data.token);
  if (!token) return NextResponse.json({ error: 'invalid round' }, { status: 400 });
  try {
    const result = scoreGuest(token, parsed.data, parsed.data.scores, parsed.data.best);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GuessError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'invalid round' }, { status: 400 });
  }
}
