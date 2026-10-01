import { postBookingMessage } from '@/server/handlers';
import { route } from '@/lib/route';

export const POST = route((c, body, p) => postBookingMessage(c, p.id, body));
