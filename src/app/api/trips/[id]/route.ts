import { NextResponse } from 'next/server';
import { route } from '@/lib/route';

export const DELETE = route(async (c, _b, p) => {
  if (!c.user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const ok = await c.repo.deleteTrip(c.user.id, p.id);
  return NextResponse.json(ok ? { ok: true } : { error: 'Not found' }, { status: ok ? 200 : 404 });
});
