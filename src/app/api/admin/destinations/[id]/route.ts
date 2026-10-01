import { adminUpdateDestination } from '@/server/handlers-admin';
import { route } from '@/lib/route';

export const PATCH = route((c, body, p) => adminUpdateDestination(c, p.id, body));
