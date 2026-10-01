import { adminSetRole } from '@/server/handlers-admin';
import { route } from '@/lib/route';

export const PATCH = route((c, body, p) => adminSetRole(c, p.id, body));
