import { reviewListing } from '@/server/handlers';
import { route } from '@/lib/route';

export const POST = route((c, body, p) => reviewListing(c, p.id, body));
