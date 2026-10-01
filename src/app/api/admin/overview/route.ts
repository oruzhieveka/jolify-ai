import { adminOverview } from '@/server/handlers-admin';
import { route } from '@/lib/route';

export const GET = route((c) => adminOverview(c));
