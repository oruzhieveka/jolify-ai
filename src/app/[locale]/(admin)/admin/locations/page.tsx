import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import type { Lang } from '@/core/types';
import { localizeDestination } from '@/core/localize';
import { PageHead, Table, td } from '@/components/portal/shell';
import { AdminActions } from '@/components/moderation-buttons';
import { Badge } from '@/components/ui';

export default async function Locations({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const T = t.admin.table; const L = t.admin.locations;
  const c = (await adminCtx(locale, '/' + locale + '/admin/locations'))!;
  const dests = await c.repo.allDestinations();
  return (
    <>
      <PageHead admin title={t.admin.nav.locations} intro={L.intro} actions={<Link href={'/' + locale + '/admin/locations/new'} className="inline-flex min-h-11 items-center rounded-full bg-apricot-500 px-4 text-sm font-medium text-ink hover:bg-apricot-400">{L.new}</Link>} />
      <Table admin head={[T.name, T.region, T.coords, T.published, T.actions]}>
        {dests.map((d) => (
          <tr key={d.id}>
            <td className={td}><div className="font-medium">{localizeDestination(d, locale as Lang).name}</div><div className="text-xs text-snow/50">{d.id}</div></td>
            <td className={td}>{d.region}</td>
            <td className={td + ' tabular-nums text-snow/60'}>{d.lat.toFixed(3)}, {d.lon.toFixed(3)}</td>
            <td className={td}><Badge tone={d.published !== false ? 'ok' : 'neutral'}>{d.published !== false ? t.admin.yes : t.admin.no}</Badge></td>
            <td className={td}><div className="flex flex-wrap items-center gap-2"><Link href={'/' + locale + '/admin/locations/' + d.id} className="inline-flex min-h-11 items-center rounded-full bg-white/5 px-4 text-sm hover:bg-white/10">{L.editData}</Link><Link href={'/' + locale + '/admin/content/' + d.id} className="inline-flex min-h-11 items-center rounded-full bg-white/5 px-4 text-sm hover:bg-white/10">{L.edit}</Link>
              <AdminActions endpoint={'/api/admin/destinations/' + d.id} method="PATCH" actions={[d.published !== false ? { label: L.unpublish, body: { published: false }, confirm: true } : { label: L.publish, body: { published: true } }]} /></div></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
