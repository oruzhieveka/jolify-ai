import { getBusiness, updateBusiness } from '@/server/handlers-portal';
import { route } from '@/lib/route';

export const GET = route((c, _b, p) => getBusiness(c, p.id));
export const PUT = route((c, body, p) => updateBusiness(c, p.id, body));
