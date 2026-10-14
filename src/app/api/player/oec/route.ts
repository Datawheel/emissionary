import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  OecTokenConfigError,
  OecTokenExpiredError,
  verifyGamesToken,
} from '@/lib/auth/oec';
import { linkOecPlayer } from '@/lib/auth/oec-link';
import { hasConsent } from '@/lib/consent';
import { currentPlayer, setPlayerCookie } from '@/lib/player';
import { limited } from '@/lib/ratelimit';

const bodySchema = z.object({ token: z.string().min(1).max(4096) });

/**
 * POST /api/player/oec  { token }
 * Called when the OEC parent hands over a signed session. Identity comes only
 * from the verified JWT's `sub`; nothing else in the body is read.
 */
export async function POST(req: NextRequest) {
  if (!(await hasConsent())) return NextResponse.json({ error: 'consent required' }, { status: 403 });
  const tooMany = limited(req, 'oec-link', 30, 60 * 60 * 1000);
  if (tooMany) return tooMany;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'token is required' }, { status: 400 });

  let claims;
  try {
    claims = await verifyGamesToken(parsed.data.token);
  } catch (e) {
    if (e instanceof OecTokenConfigError) {
      console.error('OEC login misconfigured:', e.message);
      return NextResponse.json({ error: 'OEC login unavailable' }, { status: 503 });
    }
    if (e instanceof OecTokenExpiredError) {
      // the client asks the parent for a fresh token
      return NextResponse.json({ error: 'token expired', code: 'token_expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  }

  const result = await linkOecPlayer(await currentPlayer(), claims);
  if (result.status === 'pending') return NextResponse.json({ linked: false, pending: true });
  if (result.changed) await setPlayerCookie(result.playerId);
  return NextResponse.json({
    linked: true,
    changed: result.changed,
    updated: result.changed || result.seeded,
    name: result.name,
  });
}
