import { changeBookingStatus } from '@/server/handlers';
import { route } from '@/lib/route';

export const POST = route((c, body, p) => changeBookingStatus(c, p.id, body));
