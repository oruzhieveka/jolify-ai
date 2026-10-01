import { decideApplication } from '@/server/handlers';
import { route } from '@/lib/route';

export const POST = route((c, body, p) => decideApplication(c, p.id, body));
