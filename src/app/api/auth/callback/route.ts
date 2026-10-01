import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Magic-link landing: exchanges the auth code for a session cookie. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nextRaw = url.searchParams.get('next') ?? '/';
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/';
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/en/login?error=' + encodeURIComponent('Sign-in link is invalid or expired'), url.origin));
}
