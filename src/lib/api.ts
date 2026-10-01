import 'server-only';
import { NextResponse } from 'next/server';
import type { Res } from '@/server/handlers';

/** Turns a framework-agnostic handler result into a JSON response. */
export const respond = (r: Res) => NextResponse.json(r.body, { status: r.status });

/** Parses a JSON body without throwing; invalid JSON becomes undefined (handlers then return 400). */
export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { return undefined; }
}

/** Rejects cross-site state-changing requests (defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from older browsers / server calls
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}

export const forbiddenOrigin = () => NextResponse.json({ error: 'Cross-site request rejected', code: 'forbidden' }, { status: 403 });
