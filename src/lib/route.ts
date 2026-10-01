import 'server-only';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getCtx } from '@/server/context';
import type { Ctx, Res } from '@/server/handlers';
import { forbiddenOrigin, readJson, respond, sameOrigin } from './api';

type P = Promise<Record<string, string>>;

/**
 * Wraps a handler as a Next.js route: same-origin check for writes, JSON parsing,
 * request context (repo + user + AI config) and error capture.
 */
export function route(fn: (c: Ctx, body: unknown, params: Record<string, string>, req: Request) => Promise<Res | Response>, opts: { rawBody?: boolean } = {}) {
  return async (req: Request, ctx: { params: P }) => {
    if (req.method !== 'GET' && !sameOrigin(req)) return forbiddenOrigin();
    try {
      const [c, params] = await Promise.all([getCtx(), ctx?.params ?? Promise.resolve({})]);
      const body = req.method === 'GET' || req.method === 'DELETE' || opts.rawBody ? undefined : await readJson(req);
      const out = await fn(c, body, params as Record<string, string>, req);
      return out instanceof Response ? out : respond(out);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return NextResponse.json({ error: 'Internal error', code: 'server' }, { status: 500 });
    }
  };
}
