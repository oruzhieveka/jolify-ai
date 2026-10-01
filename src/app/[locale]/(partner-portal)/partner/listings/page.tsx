import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { usd } from '@/core/pricing';
import { PageHead, Table, td } from '@/components/portal/shell';
import { Badge, Empty, buttonClass } from '@/components/ui';
import { LISTING_TONE as TONE } from '@/components/portal/tones';
import { getStorage } from '@/server/context';


export default async function ListingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const L = t.portal.listings;
  const c = await portalCtx(locale, '/' + locale + '/partner/listings');
  const d = await portalData(c, 30);
  const covers = await c.repo.coverPhotos('listing', d.listings.map((x) => x.id));
  const [cat, storage] = await Promise.all([c.repo.catalog(), getStorage()]);
  return (
    <>
      <PageHead title={L.title} actions={<Link href={'/' + locale + '/partner/listings/new'} className={buttonClass('primary')}>{L.new}</Link>} />
      {d.listings.length === 0 ? <Empty>{L.empty}</Empty> : (
        <Table head={[L.fTitle, L.statusCol, L.price, L.views, L.requests, L.actions]}>
          {d.listings.map((l) => (
            <tr key={l.id}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-ink/5">{(() => { const m = covers.find((x) => x.owner_id === l.id); /* eslint-disable-next-line @next/next/no-img-element */ return m ? <img src={storage.publicUrl(m.storage_path)} alt={m.alt ?? ''} className="h-full w-full object-cover" /> : null; })()}</div>
                  <div><Link className="font-medium hover:underline" href={'/' + locale + '/partner/listings/' + l.id}>{l.title}</Link><div className="text-xs text-ink/50">{t.categories[l.category]} · {cat.dest(l.destinationId)?.name[locale as 'en'] ?? cat.dest(l.destinationId)?.name.en ?? l.destinationId}</div></div>
                </div>
              </td>
              <td className={td}><Badge tone={TONE[l.status]}>{L.st[l.status]}</Badge>{l.isDemo && <Badge tone="warn" className="ml-1">{t.sampleBadge}</Badge>}</td>
              <td className={td + ' tabular-nums'}>{usd(l.priceUsd)}<div className="text-xs text-ink/50">{t.units[l.unit]}</div></td>
              <td className={td + ' tabular-nums'}>{d.stats.viewsByListing[l.id] ?? 0}</td>
              <td className={td + ' tabular-nums'}>{d.stats.inquiriesByListing[l.id] ?? 0}</td>
              <td className={td}><div className="flex gap-2"><Link className={buttonClass('outline', 'sm')} href={'/' + locale + '/partner/listings/' + l.id}>{t.common.edit}</Link><Link className={buttonClass('ghost', 'sm')} href={'/' + locale + '/partner/photos?listing=' + l.id}>{L.photos}</Link></div></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
