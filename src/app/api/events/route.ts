import { NextResponse } from 'next/server';
import { recordEvent } from '@/server/handlers';
import { clientIp } from '@/server/context';
import { rateLimit } from '@/lib/rate-limit';
import { route } from '@/lib/route';

export const POST = route(async (c, body) => {
  if (!rateLimit('ev:' + (c.sessionId ?? (await clientIp())), 120).ok) return NextResponse.json({ ok: false }, { status: 429 });
  return recordEvent(c, body);
});
