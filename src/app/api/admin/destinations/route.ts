import { adminCreateDestination } from '@/server/handlers-admin';
import { route } from '@/lib/route';

export const POST = route((c, body) => adminCreateDestination(c, body));
