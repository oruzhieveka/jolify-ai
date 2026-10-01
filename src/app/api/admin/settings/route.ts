import { adminUpdateSettings } from '@/server/handlers-admin';
import { route } from '@/lib/route';

export const PATCH = route((c, body) => adminUpdateSettings(c, body));
