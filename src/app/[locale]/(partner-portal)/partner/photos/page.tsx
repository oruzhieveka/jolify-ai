import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { env } from '@/lib/env';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { PageHead, Panel } from '@/components/portal/shell';
import { PhotoManager } from '@/components/portal/photo-manager';
import { Empty } from '@/components/ui';

/** One place to manage every photo the partner owns: the business profile and each listing. */
export default async function PhotosPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ listing?: string; partner?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale);
  const c = await portalCtx(locale, '/' + locale + '/partner/photos');
  const d = await portalData(c, 1);
  const owners = [
    ...d.partners.map((p) => ({ type: 'partner' as const, id: p.id, label: t.portal.business + ': ' + p.name })),
    ...d.listings.map((l) => ({ type: 'listing' as const, id: l.id, label: l.title })),
  ];
  const sel = owners.find((o) => (sp.listing ? o.type === 'listing' && o.id === sp.listing : sp.partner ? o.type === 'partner' && o.id === sp.partner : false)) ?? owners[0];
  return (
    <>
      <PageHead title={t.photos.title} intro={t.photos.hint} />
      {!sel ? <Empty>{t.portal.listings.empty}</Empty> : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav aria-label={t.photos.pick} className="flex gap-2 overflow-x-auto lg:flex-col">
            {owners.map((o) => (
              <Link key={o.type + o.id} href={'?' + o.type + '=' + o.id} aria-current={o === sel ? 'true' : undefined}
                className={'shrink-0 rounded-xl px-3 py-2 text-sm ' + (o === sel ? 'bg-ink text-snow' : 'bg-white hover:bg-ink/5 border border-ink/10')}>{o.label}</Link>
            ))}
          </nav>
          <Panel><h2 className="mb-3 font-semibold">{sel.label}</h2><PhotoManager key={sel.type + sel.id} ownerType={sel.type} ownerId={sel.id} demo={env.demoMode} /></Panel>
        </div>
      )}
    </>
  );
}
