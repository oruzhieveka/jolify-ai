import { fmt, getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { adminOverview } from '@/server/handlers-admin';
import { Metric, PageHead } from '@/components/portal/shell';
import { Alert } from '@/components/ui';

type Counts = Record<'users' | 'partners' | 'samplePartners' | 'listingsLive' | 'sampleListings' | 'listingsPending' | 'applicationsPending' | 'inquiries' | 'bookingsConfirmed' | 'paymentsPaid' | 'revenueUsd' | 'testPayments' | 'events' | 'plans', number>;

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const C = t.admin.counts;
  const c = (await adminCtx(locale, '/' + locale + '/admin'))!;
  const { counts: k, dataSource } = (await adminOverview(c)).body as { counts: Counts; dataSource: string };
  return (
    <>
      <PageHead admin title={t.admin.nav.overview} intro={t.admin.dataSource + ': ' + (dataSource === 'memory' ? t.admin.memory : t.admin.supabase)} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric admin label={C.users} value={k.users} />
        <Metric admin label={C.partners} value={k.partners} />
        <Metric admin label={C.listingsLive} value={k.listingsLive} />
        <Metric admin label={C.inquiries} value={k.inquiries} />
        <Metric admin label={C.bookingsConfirmed} value={k.bookingsConfirmed} />
        <Metric admin label={C.paymentsPaid} value={k.paymentsPaid} />
        <Metric admin label={C.revenueUsd} value={'$' + k.revenueUsd.toLocaleString('en-US')} />
        <Metric admin label={C.plans} value={k.plans} />
        <Metric admin label={C.listingsPending} value={k.listingsPending} />
        <Metric admin label={C.applicationsPending} value={k.applicationsPending} />
      </div>
      <p className="mt-4 text-xs text-snow/40">{t.admin.realOnly}</p>
      {(k.samplePartners > 0 || k.sampleListings > 0) && <Alert tone="warn" className="mt-4">{fmt(C.samples, { p: k.samplePartners, l: k.sampleListings })}</Alert>}
    </>
  );
}
