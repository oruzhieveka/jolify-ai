import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { LISTING_STATUSES, type ListingStatus } from '@/core/types';
import { usd } from '@/core/pricing';
import { PageHead, Table, td } from '@/components/portal/shell';
import { AdminActions } from '@/components/moderation-buttons';
import { LISTING_TONE } from '@/components/portal/tones';
import { Badge, Empty } from '@/components/ui';

export default async function AdminListings({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale); const T = t.admin.table; const A = t.admin; const S = t.portal.listings.st;
  const c = (await adminCtx(locale, '/' + locale + '/admin/listings'))!;
  const [all, partners] = await Promise.all([c.repo.allListings(), c.repo.listPartnerProfiles()]);
  const status = LISTING_STATUSES.includes(sp.status as ListingStatus) ? (sp.status as ListingStatus) : null;
  const rows = status ? all.filter((l) => l.status === status) : all;
  return (
    <>
      <PageHead admin title={A.nav.listings} actions={[null, ...LISTING_STATUSES].map((s) => <Link key={s ?? 'all'} href={s ? '?status=' + s : '?'} className={'rounded-full px-3 py-1 text-sm ' + (s === status ? 'bg-apricot-500 text-ink' : 'bg-white/5')}>{s ? S[s] : t.all}</Link>)} />
      {!rows.length ? <Empty>{A.empty}</Empty> : (
        <Table admin head={[T.listing, T.partner, T.destination, T.price, T.status, T.actions]}>
          {rows.map((l) => (
            <tr key={l.id}>
              <td className={td}><Link className="font-medium hover:underline" href={'/' + locale + '/listings/' + l.id}>{l.title}</Link><div className="text-xs text-snow/50">{t.categories[l.category]}</div></td>
              <td className={td}>{partners.find((p) => p.id === l.partnerId)?.name ?? l.partnerId}</td>
              <td className={td}>{l.destinationId}</td>
              <td className={td + ' tabular-nums'}>{usd(l.priceUsd)} <span className="text-xs text-snow/50">{t.units[l.unit]}</span></td>
              <td className={td}><Badge tone={LISTING_TONE[l.status]}>{S[l.status]}</Badge>{l.isDemo && <Badge tone="warn" className="ml-1">{A.sample}</Badge>}</td>
              <td className={td}><AdminActions endpoint={'/api/admin/listings/' + l.id} actions={[
                ...(l.status !== 'approved' ? [{ label: A.approve, body: { status: 'approved' }, variant: 'primary' as const }] : []),
                ...(l.status === 'pending_review' ? [{ label: A.reject, body: { status: 'rejected' }, confirm: true }] : []),
                ...(l.status === 'approved' ? [{ label: A.suspend, body: { status: 'suspended' }, variant: 'danger' as const, confirm: true }] : []),
              ]} /></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
