import { err, ok } from '@/server/handlers';
import { route } from '@/lib/route';

export const GET = route(async (c) => (c.user ? ok({ conversations: await c.repo.listConversations(c.user.id) }) : err(401, 'Sign in required')));
