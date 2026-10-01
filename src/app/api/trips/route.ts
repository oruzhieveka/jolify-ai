import { listTrips, saveTrip } from '@/server/handlers';
import { route } from '@/lib/route';

export const GET = route((c) => listTrips(c));
export const POST = route((c, body) => saveTrip(c, body));
