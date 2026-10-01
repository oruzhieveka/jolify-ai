import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { env, serverEnv } from '../env';

/** User-scoped client: every query runs under the user's JWT, so Postgres RLS applies. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* called from a Server Component */ }
      },
    },
  });
}

/** Service-role client. Bypasses RLS: use only for analytics inserts and audited admin jobs. */
export function supabaseService() {
  const { serviceRoleKey } = serverEnv();
  if (!serviceRoleKey) return null;
  return createClient(env.supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}
