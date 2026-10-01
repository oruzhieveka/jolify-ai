import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { PageHead } from '@/components/portal/shell';
import { AdminBookingsTable } from '@/components/portal/admin-bookings-table';

export default async function AdminBookings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = (await adminCtx(locale, '/' + locale + '/admin/bookings'))!;
  const [b, l, p] = await Promise.all([c.repo.allBookings(), c.repo.allListings(), c.repo.payments()]);
  return <><PageHead admin title={t.admin.nav.bookings} intro={t.admin.bookings.intro} /><AdminBookingsTable t={t} rows={b} listings={l} payments={p} /></>;
}
