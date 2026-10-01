/** Centralised env access. Server-only values are never read in client components. */
export const env = {
  // Demo mode is opt-in only. A missing Supabase URL no longer silently falls back to demo data.
  demoMode: process.env.DEMO_MODE === 'true',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export function serverEnv() {
  if (typeof window !== 'undefined') throw new Error('serverEnv() called in the browser');
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',
    aiRatePerMinute: Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 8),
  };
}

/** Called from instrumentation at server start. Fails loudly instead of rendering broken UI. */
export function assertEnv(e: Record<string, string | undefined> = process.env): void {
  if (e.DEMO_MODE === 'true') {
    if (e.NODE_ENV === 'production' && e.ALLOW_DEMO_IN_PRODUCTION !== 'true') throw new Error('[env] DEMO_MODE=true in a production build. Set DEMO_MODE=false (or ALLOW_DEMO_IN_PRODUCTION=true for a staging preview).');
    return;
  }
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL'];
  const missing = required.filter((k) => !e[k]);
  if (missing.length) throw new Error('[env] Missing required variables: ' + missing.join(', ') + '. See .env.example.');
  if (e.NEXT_PUBLIC_MAP_PROVIDER === 'mapbox' && !e.NEXT_PUBLIC_MAPBOX_TOKEN) throw new Error('[env] NEXT_PUBLIC_MAP_PROVIDER=mapbox requires NEXT_PUBLIC_MAPBOX_TOKEN.');
  if (e.SUPABASE_SERVICE_ROLE_KEY && e.NEXT_PUBLIC_SUPABASE_ANON_KEY === e.SUPABASE_SERVICE_ROLE_KEY) throw new Error('[env] Anon key equals service-role key. The service-role key must never be public.');
}
