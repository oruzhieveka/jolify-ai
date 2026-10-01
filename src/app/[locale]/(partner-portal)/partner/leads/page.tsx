import { getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { withThreads } from '@/server/handlers';
import { PageHead } from '@/components/portal/shell';
import { BookingThread, type BookingView } from '@/components/booking-thread';
import { Empty } from '@/components/ui';

export default async function LeadsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await portalCtx(locale, '/' + locale + '/partner/leads');
  const d = await portalData(c, 30);
  const open = (await withThreads(c, d.bookings.filter((b) => b.status === 'pending'))) as BookingView[];
  return (
    <>
      <PageHead title={t.portal.leads.title} intro={t.portal.leads.intro} />
      {open.length ? <div className="space-y-3">{open.map((b) => <BookingThread key={b.id} b={b} role="partner" me={c.user!.id} />)}</div> : <Empty>{t.portal.leads.empty}</Empty>}
    </>
  );
}
