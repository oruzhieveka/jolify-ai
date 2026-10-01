import 'server-only';
import { redirect } from 'next/navigation';
import { getCtx } from './context';
import type { Ctx } from './handlers';

/** Server-side gate for portal pages. Unauthenticated users go to login; wrong role gets null (page renders 403). */
export async function portalCtx(locale: string, next: string): Promise<Ctx> {
  const c = await getCtx();
  if (!c.user) redirect('/' + locale + '/login?next=' + encodeURIComponent(next));
  return c;
}
export async function adminCtx(locale: string, next: string): Promise<Ctx | null> {
  const c = await portalCtx(locale, next);
  return c.user?.role === 'admin' ? c : null;
}
