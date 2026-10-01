import { createListing, partnerOverview } from '@/server/handlers';
import { route } from '@/lib/route';

export const GET = route((c) => partnerOverview(c));
export const POST = route((c, body) => createListing(c, body));
