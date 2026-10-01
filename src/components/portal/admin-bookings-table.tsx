import type { Dict } from '@/i18n/dict';
import type { BookingRecord, PaymentRow } from '@/server/repo';
import type { Listing } from '@/core/types';
import { usd } from '@/core/pricing';
import { Table, td } from './shell';
import { Badge, Empty } from '@/components/ui';

export function AdminBookingsTable({ t, rows, listings, payments = [] }: { t: Dict; rows: BookingRecord[]; listings: Listing[]; payments?: PaymentRow[] }) {
  const T = t.admin.table;
  if (!rows.length) return <Empty>{t.admin.empty}</Empty>;
  return (
    <Table admin head={[T.created, T.listing, T.dates, T.guests, T.total, T.status, t.portal.bookings.payment]}>
      {rows.map((b) => {
        const pay = payments.find((p) => p.booking_id === b.id);
        return (
          <tr key={b.id}>
            <td className={td + ' text-snow/50'}>{b.created_at.slice(0, 10)}</td>
            <td className={td}>{listings.find((l) => l.id === b.listing_id)?.title ?? b.listing_id}</td>
            <td className={td}>{b.start_date}{b.end_date ? ' → ' + b.end_date : ''}</td>
            <td className={td + ' tabular-nums'}>{b.guests}</td>
            <td className={td + ' tabular-nums'}>{usd(b.total_usd)}</td>
            <td className={td}><Badge>{t.status[b.status]}</Badge></td>
            <td className={td}>{pay ? <Badge tone={pay.status === 'paid' ? 'ok' : 'neutral'}>{t.payStatus[pay.status]}{pay.is_test ? ' · ' + T.test : ''}</Badge> : <span className="text-snow/40">·</span>}</td>
          </tr>
        );
      })}
    </Table>
  );
}
