import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Refreshes the Supabase auth cookie on each request (recommended @supabase/ssr pattern). */
export async function refreshSession(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  await supabase.auth.getUser();
  return res;
}
