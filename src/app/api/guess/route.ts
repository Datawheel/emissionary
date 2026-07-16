import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { currentPlayer } from '@/lib/player';
import { GuessError, submitGuess } from '@/lib/round-service';

const bodySchema = z.object({
  round_id: z.string().uuid(),
  value: z.number().positive().optional(),
  choice: z.enum(['a', 'b']).optional(),
  ms_elapsed: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: 'no player' }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  try {
    const result = await submitGuess(player, parsed.data.round_id, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GuessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
