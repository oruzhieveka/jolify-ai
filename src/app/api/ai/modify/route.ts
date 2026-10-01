import { NextResponse } from 'next/server';
import { aiModify } from '@/server/handlers';
import { clientIp } from '@/server/context';
import { serverEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { route } from '@/lib/route';

export const maxDuration = 60;
export const POST = route(async (c, body) => {
  const rl = rateLimit('ai:' + (c.user?.id ?? (await clientIp())), serverEnv().aiRatePerMinute);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests. Try again in ' + rl.retryAfter + 's.' }, { status: 429, headers: { 'retry-after': String(rl.retryAfter) } });
  return aiModify(c, body);
});
