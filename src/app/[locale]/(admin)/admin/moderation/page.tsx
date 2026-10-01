import { getDict } from '@/i18n/dict';
import { adminCtx } from '@/server/guards';
import { usd } from '@/core/pricing';
import { PageHead, Panel } from '@/components/portal/shell';
import { ModerationButtons } from '@/components/moderation-buttons';
import { Empty } from '@/components/ui';

export default async function Moderation({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale); const M = t.admin.moderation;
  const c = (await adminCtx(locale, '/' + locale + '/admin/moderation'))!;
  const [apps, pending] = await Promise.all([c.repo.listApplications('submitted'), c.repo.listingsByStatus('pending_review')]);
  return (
    <>
      <PageHead admin title={t.admin.nav.moderation} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">{M.applications} ({apps.length})</h2>
          {apps.length ? apps.map((a) => (
            <Panel admin key={a.id} className="mb-3 text-sm" >
              <div data-testid="application" className="flex justify-between gap-3"><span className="font-semibold">{a.data.business_name}</span><span className="text-snow/50">{a.created_at.slice(0, 10)}</span></div>
              <div className="text-snow/60">{t.partnerCategories[a.data.category]} · {a.data.city} · {a.data.contact_name} · {a.data.email} · {a.data.phone}</div>
              <p className="mt-2 whitespace-pre-line text-snow/80">{a.data.description}</p>
              <div className="mt-1 text-xs text-snow/40">{M.consents}: {Object.entries(a.data.consents).filter(([, v]) => v).map(([k]) => k).join(', ')} · {a.data.policy_version}</div>
              <div className="mt-3"><ModerationButtons kind="application" id={a.id} /></div>
            </Panel>
          )) : <Empty>{M.noApps}</Empty>}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">{M.listings} ({pending.length})</h2>
          {pending.length ? pending.map((l) => (
            <Panel admin key={l.id} className="mb-3 text-sm">
              <div data-testid="pending-listing" className="flex justify-between gap-3"><span className="font-semibold">{l.title}</span><span className="tabular-nums">{usd(l.priceUsd)} {t.units[l.unit]}</span></div>
              <div className="text-snow/60">{t.categories[l.category]} · {l.destinationId} · {l.partnerId}</div>
              <p className="mt-2 whitespace-pre-line text-snow/80">{l.description}</p>
              <div className="mt-3"><ModerationButtons kind="listing" id={l.id} /></div>
            </Panel>
          )) : <Empty>{M.noListings}</Empty>}
        </section>
      </div>
    </>
  );
}
