import { getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { withThreads } from '@/server/handlers';
import { PageHead } from '@/components/portal/shell';
import { BookingThread, type BookingView } from '@/components/booking-thread';
import { Empty } from '@/components/ui';

export default async function BookingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ all?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale); const B = t.portal.bookings;
  const c = await portalCtx(locale, '/' + locale + '/partner/bookings');
  const d = await portalData(c, 30);
  const rows = sp.all ? d.bookings : d.bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const list = (await withThreads(c, rows)) as BookingView[];
  return (
    <>
      <PageHead title={B.title} intro={B.intro} actions={<a href={sp.all ? '?' : '?all=1'} className="rounded-full bg-ink/5 px-3 py-1.5 text-sm">{sp.all ? B.title : B.all}</a>} />
      {list.length ? <div className="space-y-3">{list.map((b) => <BookingThread key={b.id} b={b} role="partner" me={c.user!.id} />)}</div> : <Empty>{B.empty}</Empty>}
    </>
  );
}
