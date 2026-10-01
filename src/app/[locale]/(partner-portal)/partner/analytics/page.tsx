import { fmt, getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { Metric, PageHead, Panel, Table, td } from '@/components/portal/shell';
import { Alert } from '@/components/ui';

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ days?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale); const A = t.portal.analytics; const S = t.portal.stats;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const c = await portalCtx(locale, '/' + locale + '/partner/analytics');
  const d = await portalData(c, days);
  const s = d.stats;
  const series = Object.entries(s.viewsByDay);
  const max = Math.max(1, ...series.map(([, v]) => v));
  return (
    <>
      <PageHead title={A.title} intro={fmt(A.intro, { d: days })} actions={[7, 30, 90].map((x) => <a key={x} href={'?days=' + x} className={'rounded-full px-3 py-1 text-sm ' + (x === days ? 'bg-ink text-snow' : 'bg-ink/5')}>{x}</a>)} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={fmt(S.views, { d: days })} value={s.listingViews} />
        <Metric label={fmt(S.requests, { d: days })} value={s.inquiries} />
        <Metric label={fmt(S.confirmed, { d: days })} value={s.confirmed} />
        <Metric label={S.conversion} value={s.inquiries ? Math.round((s.confirmed / s.inquiries) * 100) + '%' : 0} />
      </div>
      {s.listingViews === 0 && s.inquiries === 0 && <Alert tone="info" className="mt-4">{A.zero}</Alert>}
      <Panel className="mt-6">
        <h2 className="mb-3 font-semibold">{A.daily}</h2>
        <div className="flex h-36 items-end gap-px" role="img" aria-label={A.daily}>
          {series.map(([day, v]) => <div key={day} title={day + ': ' + v} className="flex-1 rounded-t bg-glacier-500/80" style={{ height: Math.max(2, (v / max) * 100) + '%', opacity: v ? 1 : 0.25 }} />)}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink/40"><span>{series[0]?.[0]}</span><span>{series[series.length - 1]?.[0]}</span></div>
      </Panel>
      <h2 className="mb-3 mt-6 font-semibold">{A.perListing}</h2>
      <Table head={[A.listing, A.views, A.requests]}>
        {d.listings.map((l) => <tr key={l.id}><td className={td}>{l.title}</td><td className={td + ' tabular-nums'}>{s.viewsByListing[l.id] ?? 0}</td><td className={td + ' tabular-nums'}>{s.inquiriesByListing[l.id] ?? 0}</td></tr>)}
      </Table>
    </>
  );
}
