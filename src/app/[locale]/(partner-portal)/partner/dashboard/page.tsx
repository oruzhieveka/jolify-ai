import Link from 'next/link';
import { fmt, getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { withThreads } from '@/server/handlers';
import { Metric, PageHead, Panel } from '@/components/portal/shell';
import { BookingThread, type BookingView } from '@/components/booking-thread';
import { Alert, Badge, Empty } from '@/components/ui';

export default async function PartnerDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const p = t.portal;
  const c = await portalCtx(locale, '/' + locale + '/partner/dashboard');
  const d = await portalData(c, 30);
  const s = d.stats;
  const live = d.listings.filter((x) => x.status === 'approved').length;
  const covers = await c.repo.coverPhotos('listing', d.listings.map((x) => x.id));
  const steps = [
    { done: d.partners.every((x) => x.description && x.phone), label: p.stepProfile, href: 'profile' },
    { done: d.listings.length > 0, label: p.stepListing, href: 'listings/new' },
    { done: d.listings.length > 0 && d.listings.every((x) => covers.some((m) => m.owner_id === x.id)), label: p.stepPhotos, href: 'photos' },
    { done: s.pending === 0, label: p.stepReply, href: 'leads' },
  ];
  const latest = (await withThreads(c, d.bookings.slice(0, 3))) as BookingView[];
  return (
    <>
      <PageHead title={d.partners.map((x) => x.name).join(', ')} intro={p.realDataOnly} />
      {d.partners.some((x) => x.status === 'suspended') && <Alert tone="error" className="mb-4">{p.suspended}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label={fmt(p.stats.views, { d: s.days })} value={s.listingViews} />
        <Metric label={fmt(p.stats.requests, { d: s.days })} value={s.inquiries} />
        <Metric label={p.stats.pending} value={s.pending} />
        <Metric label={fmt(p.stats.confirmed, { d: s.days })} value={s.confirmed} />
        <Metric label={p.stats.live} value={live} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">{p.latestLeads}</h2><Link className="text-sm text-glacier-700 hover:underline" href={'/' + locale + '/partner/leads'}>{p.viewAll}</Link></div>
          {latest.length ? <div className="space-y-3">{latest.map((b) => <BookingThread key={b.id} b={b} role="partner" me={c.user!.id} />)}</div> : <Empty>{p.leads.empty}</Empty>}
        </section>
        <Panel>
          <h2 className="mb-3 font-semibold">{p.nextSteps}</h2>
          <ol className="space-y-2 text-sm">
            {steps.map((x, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ' + (x.done ? 'bg-steppe-600 text-white' : 'bg-ink/5 text-ink/60')}>{x.done ? '✓' : i + 1}</span>
                <Link href={'/' + locale + '/partner/' + x.href} className={x.done ? 'text-ink/40 line-through' : 'hover:underline'}>{x.label}</Link>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-1.5">{d.partners.map((x) => <Badge key={x.id} tone={x.verified ? 'ok' : 'neutral'}>{x.name}{x.verified ? ' · ' + t.verified : ''}</Badge>)}</div>
        </Panel>
      </div>
    </>
  );
}
