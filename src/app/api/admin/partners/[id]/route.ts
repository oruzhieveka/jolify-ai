import { adminPartnerFlags } from '@/server/handlers-admin';
import { route } from '@/lib/route';

export const PATCH = route((c, body, p) => adminPartnerFlags(c, p.id, body));
