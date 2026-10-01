import 'server-only';
import { cookies, headers } from 'next/headers';
import { env } from '@/lib/env';
import { supabaseServer, supabaseService } from '@/lib/supabase/server';
import { MemoryRepo } from './repo-memory.ts';
import { MemoryStorage, SupabaseStorage, type StorageAdapter } from './storage.ts';
import { SupabaseRepo } from './repo-supabase.ts';
import type { Ctx } from './handlers.ts';
import { providerFromEnv, type LlmProvider } from './ai/provider.ts';
import type { Repo, SessionUser } from './repo.ts';

// One in-memory store per server process in demo mode (survives hot reload via globalThis).
const g = globalThis as unknown as { __jolifyDemo?: MemoryRepo };
export function demoRepo(): MemoryRepo {
  if (!g.__jolifyDemo) {
    g.__jolifyDemo = new MemoryRepo();
    g.__jolifyDemo.partnerMembers.push({ user_id: 'demo-partner', partner_id: 'p-nomad' }, { user_id: 'demo-partner', partner_id: 'p-tienshan' });
    const at = new Date().toISOString();
    g.__jolifyDemo.profiles.push(
      { id: 'demo-traveler', email: 'traveler@demo.jolify', full_name: 'Demo traveller', role: 'traveler', created_at: at },
      { id: 'demo-partner', email: 'partner@demo.jolify', full_name: 'Demo partner', role: 'partner', created_at: at },
      { id: 'demo-admin', email: 'admin@demo.jolify', full_name: 'Demo admin', role: 'admin', created_at: at },
    );
  }
  return g.__jolifyDemo;
}

export const DEMO_USERS: Record<string, SessionUser> = {
  traveler: { id: 'demo-traveler', role: 'traveler', email: 'traveler@demo.jolify' },
  partner: { id: 'demo-partner', role: 'partner', email: 'partner@demo.jolify' },
  admin: { id: 'demo-admin', role: 'admin', email: 'admin@demo.jolify' },
};
export const DEMO_COOKIE = 'jolify_demo_role';
export const SESSION_COOKIE = 'jolify_sid';

export async function getSessionUser(): Promise<SessionUser | null> {
  if (env.demoMode) {
    const role = (await cookies()).get(DEMO_COOKIE)?.value;
    return role ? DEMO_USERS[role] ?? null : null;
  }
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
  return { id: data.user.id, role: (profile?.role as SessionUser['role']) ?? 'traveler', email: data.user.email };
}

export async function getRepo(): Promise<Repo> {
  if (env.demoMode) return demoRepo();
  return new SupabaseRepo(await supabaseServer(), supabaseService());
}

const gs = globalThis as unknown as { __jolifyDemoStorage?: MemoryStorage };
export function demoStorage(): MemoryStorage { return (gs.__jolifyDemoStorage ??= new MemoryStorage()); }
/** User-scoped storage client in production so Storage RLS applies to every write. */
export async function getStorage(): Promise<StorageAdapter> {
  if (env.demoMode) return demoStorage();
  return new SupabaseStorage(await supabaseServer());
}

export async function getCtx(): Promise<Ctx> {
  const [repo, user, jar] = await Promise.all([getRepo(), getSessionUser(), cookies()]);
  return {
    repo, user, sessionId: jar.get(SESSION_COOKIE)?.value ?? null,
    ai: { anthropic: null, llm: getLlm() },
  };
}

/** Server-only. Reads AI_* (or legacy ANTHROPIC_*) env vars; null means "not configured". */
export function getLlm(): LlmProvider | null {
  return providerFromEnv({ AI_PROVIDER: process.env.AI_PROVIDER, AI_API_KEY: process.env.AI_API_KEY, AI_MODEL: process.env.AI_MODEL, AI_BASE_URL: process.env.AI_BASE_URL, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL });
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-nf-client-connection-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
