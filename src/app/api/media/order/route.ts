import { reorderPhotos } from '@/server/handlers-portal';
import { getStorage } from '@/server/context';
import { route } from '@/lib/route';

/** Body: { owner_type, owner_id, ids: string[] (new order), cover_id?: string } */
export const PUT = route(async (c, body) => reorderPhotos(c, await getStorage(), body));
