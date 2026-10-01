import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { PageHead } from '@/components/portal/shell';
import { AdminBookingsTable } from '@/components/portal/admin-bookings-table';

export default async function AdminLeads({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = (await adminCtx(locale, '/' + locale + '/admin/leads'))!;
  const [b, l] = await Promise.all([c.repo.allBookings(), c.repo.allListings()]);
  return <><PageHead admin title={t.admin.nav.leads} intro={t.admin.leads.intro} /><AdminBookingsTable t={t} rows={b.filter((x) => x.status === 'pending')} listings={l} /></>;
}
