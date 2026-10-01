import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { sameOrigin, forbiddenOrigin } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';
import { DEMO_COOKIE } from '@/server/context';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbiddenOrigin();
  if (!env.demoMode) await (await supabaseServer()).auth.signOut();
  const res = NextResponse.redirect(new URL('/', req.url), 303);
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
