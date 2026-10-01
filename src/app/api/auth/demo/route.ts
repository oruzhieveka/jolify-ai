import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { sameOrigin, forbiddenOrigin } from '@/lib/api';
import { DEMO_COOKIE, DEMO_USERS } from '@/server/context';

/** Demo-only sign in. Returns 404 whenever Supabase auth is configured. */
export async function POST(req: Request) {
  if (!env.demoMode) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!sameOrigin(req)) return forbiddenOrigin();
  const fd = await req.formData().catch(() => null);
  const role = String(fd?.get('role') ?? '');
  const nextRaw = String(fd?.get('next') ?? '/');
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';
  if (!DEMO_USERS[role]) return NextResponse.json({ error: 'Unknown demo role' }, { status: 400 });
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(DEMO_COOKIE, role, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
  return res;
}
