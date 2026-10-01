import { createInquiry } from '@/server/handlers';
import { route } from '@/lib/route';

export const POST = route((c, body) => createInquiry(c, body));
