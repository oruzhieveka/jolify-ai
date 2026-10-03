import { NextResponse } from 'next/server';
import { env, serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';
/** Liveness + configuration report (no secrets). */
export function GET() {
  const s = serverEnv();
  const ai = process.env.AI_PROVIDER === 'openai_compatible' && process.env.AI_API_KEY && process.env.AI_BASE_URL
    ? `openai_compatible:${process.env.AI_MODEL ?? 'unknown'}`
    : s.anthropicKey
      ? 'anthropic'
      : 'rules-only';
  return NextResponse.json({ ok: true, mode: env.demoMode ? 'demo' : 'supabase', ai, sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN, time: new Date().toISOString() });
}
