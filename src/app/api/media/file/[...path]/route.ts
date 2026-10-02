import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { demoStorage } from '@/server/context';

/** Serves photos from the in-memory store in demo mode only. Production URLs point at Supabase Storage. */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!env.demoMode) return NextResponse.json({ error: 'Not found', code: 'not_found' }, { status: 404 });
  const { path } = await ctx.params;
  const f = demoStorage().get(path.map(decodeURIComponent).join('/'));
  if (!f) return NextResponse.json({ error: 'Not found', code: 'not_found' }, { status: 404 });
  return new NextResponse(new Blob([f.bytes as unknown as ArrayBuffer], { type: f.type }), { headers: { 'content-type': f.type, 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' } });
}
