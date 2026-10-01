import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDict } from '@/i18n/dict';
import { env } from '@/lib/env';
import { portalCtx } from '@/server/guards';
import { managedPartnerIds } from '@/server/handlers-portal';
import { dname } from '@/core/catalog';
import type { Lang } from '@/core/types';
import { PageHead, Panel } from '@/components/portal/shell';
import { ListingEditor } from '@/components/portal/listing-editor';
import { PhotoManager } from '@/components/portal/photo-manager';
import { Alert, Badge } from '@/components/ui';
import { LISTING_TONE as TONE } from '@/components/portal/tones';

export default async function EditListing({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ locale, id }, sp] = await Promise.all([params, searchParams]);
  const t = getDict(locale); const L = t.portal.listings;
  const c = await portalCtx(locale, '/' + locale + '/partner/listings/' + id);
  const l = await c.repo.listing(id);
  // Ownership is re-checked here; another partner's id simply 404s.
  if (!l || !(await managedPartnerIds(c)).includes(l.partnerId)) notFound();
  const cat = await c.repo.catalog();
  return (
    <>
      <Link href={'/' + locale + '/partner/listings'} className="text-sm text-ink/50 hover:underline">← {L.back}</Link>
      <PageHead title={l.title} actions={<Badge tone={TONE[l.status]}>{L.st[l.status]}</Badge>} />
      {sp.created && <Alert tone="ok" className="mb-4">{sp.created === 'draft' ? L.saved : L.submitted}</Alert>}
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_520px]">
        <ListingEditor locale={locale} partners={[]} destinations={cat.destinations.map((x) => ({ id: x.id, name: dname(x, locale as Lang) }))} listing={l} />
        <Panel><h2 className="mb-3 font-semibold">{L.photos}</h2><PhotoManager ownerType="listing" ownerId={l.id} demo={env.demoMode} /></Panel>
      </div>
    </>
  );
}
