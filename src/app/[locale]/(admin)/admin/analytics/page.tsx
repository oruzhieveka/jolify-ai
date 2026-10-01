import { fmt, getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { adminSummary } from '@/server/handlers';
import type { summarize } from '@/core/analytics';
import { Metric, PageHead, Panel } from '@/components/portal/shell';
import { Badge } from '@/components/ui';

export default async function AdminAnalytics({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ days?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale); const A = t.admin.analytics; const M = t.admin.metrics as Record<string, string>;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const c = (await adminCtx(locale, '/' + locale + '/admin/analytics'))!;
  const { summary: s } = (await adminSummary(c, days)).body as { summary: ReturnType<typeof summarize> };
  const max = Math.max(1, ...s.daily.map((d) => d.views + d.plans));
  const groups = [['traffic', s.traffic], ['ai', s.ai], ['marketplace', s.marketplace], ['value', s.financial]] as const;
  return (
    <>
      <PageHead admin title={t.admin.nav.analytics} intro={fmt(A.intro, { d: days })} actions={[7, 30, 90].map((x) => <a key={x} href={'?days=' + x} className={'rounded-full px-3 py-1 text-sm ' + (x === days ? 'bg-apricot-500 text-ink' : 'bg-white/5')}>{x}</a>)} />
      {groups.map(([g, ms]) => (
        <section key={g} className="mb-6"><h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-snow/50">{t.admin.groups[g]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{ms.map((m) => <Metric admin key={m.label} label={M[m.label] ?? m.label} value={m.value} hint={m.hint ? M[m.hint] : undefined} />)}</div></section>
      ))}
      <Panel admin className="mb-6"><h2 className="mb-2 font-semibold">{A.byStatus}</h2><div className="flex flex-wrap gap-2">{Object.keys(t.status).map((k) => <Badge key={k}>{t.status[k as keyof typeof t.status]}: {s.bookingsByStatus[k] ?? 0}</Badge>)}</div></Panel>
      <Panel admin>
        <h2 className="mb-3 font-semibold">{A.daily}</h2>
        <div className="flex h-40 items-end gap-0.5" role="img" aria-label={A.daily}>
          {s.daily.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col justify-end" title={d.date + ': ' + d.views + ' / ' + d.plans}>
              <div className="bg-apricot-500" style={{ height: (d.plans / max) * 100 + '%' }} /><div className="bg-glacier-500" style={{ height: (d.views / max) * 100 + '%' }} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-snow/50"><span className="text-glacier-500">■</span> {A.views} <span className="ml-3 text-apricot-500">■</span> {A.plans}</p>
      </Panel>
    </>
  );
}
