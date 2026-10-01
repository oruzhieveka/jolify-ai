import { deletePhoto, updatePhoto } from '@/server/handlers-portal';
import { getStorage } from '@/server/context';
import { route } from '@/lib/route';

export const PATCH = route((c, body, p) => updatePhoto(c, p.id, body));
export const DELETE = route(async (c, _b, p) => deletePhoto(c, await getStorage(), p.id));
