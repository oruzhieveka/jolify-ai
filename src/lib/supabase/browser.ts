'use client';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '../env';

let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabaseBrowser() {
  if (!env.supabaseUrl) return null; // demo mode
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
