import { NextResponse } from 'next/server';
import { env, serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';
/** Liveness + configuration report (no secrets). */
export function GET() {
  const s = serverEnv();
  return NextResponse.json({ ok: true, mode: env.demoMode ? 'demo' : 'supabase', ai: s.anthropicKey ? 'anthropic' : 'rules-only', sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN, time: new Date().toISOString() });
}
