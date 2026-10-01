import { adminSummary } from '@/server/handlers';
import { route } from '@/lib/route';

export const GET = route((c, _b, _p, req) => {
  const d = Number(new URL(req.url).searchParams.get('days'));
  return adminSummary(c, [7, 30, 90].includes(d) ? d : 30);
});
