import { partnerApply } from '@/server/handlers';
import { route } from '@/lib/route';

export const POST = route((c, body) => partnerApply(c, body));
