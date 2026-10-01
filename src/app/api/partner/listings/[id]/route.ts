import { deleteListingH, updateListingH } from '@/server/handlers-portal';
import { getStorage } from '@/server/context';
import { route } from '@/lib/route';

export const PATCH = route((c, body, p) => updateListingH(c, p.id, body));
export const DELETE = route(async (c, _b, p) => deleteListingH(c, await getStorage(), p.id));
