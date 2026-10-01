import { err, ok } from '@/server/handlers';
import { route } from '@/lib/route';

export const GET = route(async (c, _b, p) => {
  if (!c.user) return err(401, 'Sign in required');
  const conv = await c.repo.getConversation(c.user.id, p.id);
  return conv ? ok({ conversation: conv }) : err(404, 'Not found');
});
export const DELETE = route(async (c, _b, p) => (!c.user ? err(401, 'Sign in required') : (await c.repo.deleteConversation(c.user.id, p.id)) ? ok({ deleted: true }) : err(404, 'Not found')));
