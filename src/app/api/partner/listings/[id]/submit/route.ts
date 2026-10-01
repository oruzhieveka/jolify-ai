import { submitListingH } from '@/server/handlers-portal';
import { route } from '@/lib/route';

export const POST = route((c, _b, p) => submitListingH(c, p.id));
