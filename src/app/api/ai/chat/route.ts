import { NextResponse } from 'next/server';
import { aiChat } from '@/server/handlers-ai';
import { clientIp, getLlm } from '@/server/context';
import { serverEnv } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { route } from '@/lib/route';

export const maxDuration = 60;

/** Streams the assistant reply as Server-Sent Events: data: {type:'token'|'done'|'error', ...} */
export const POST = route(async (c, body, _p, req) => {
  const rl = rateLimit('ai:' + (c.user?.id ?? (await clientIp())), serverEnv().aiRatePerMinute);
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests', code: 'rate_limited', retry_after: rl.retryAfter }, { status: 429, headers: { 'retry-after': String(rl.retryAfter) } });
  const out = await aiChat(c, getLlm(), body, req.signal);
  if (!(Symbol.asyncIterator in (out as object))) return out as { status: number; body: unknown };
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      try { for await (const ev of out as AsyncIterable<unknown>) ctrl.enqueue(enc.encode('data: ' + JSON.stringify(ev) + '\n\n')); }
      catch { ctrl.enqueue(enc.encode('data: ' + JSON.stringify({ type: 'error', code: 'ai_unavailable' }) + '\n\n')); }
      finally { ctrl.close(); }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } });
});
