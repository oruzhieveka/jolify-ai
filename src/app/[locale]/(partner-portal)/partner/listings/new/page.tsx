import Link from 'next/link';
import { getDict } from '@/i18n/dict';
import { portalCtx } from '@/server/guards';
import { portalData } from '@/server/handlers-portal';
import { dname } from '@/core/catalog';
import type { Lang } from '@/core/types';
import { PageHead } from '@/components/portal/shell';
import { ListingEditor } from '@/components/portal/listing-editor';

export default async function NewListing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = getDict(locale);
  const c = await portalCtx(locale, '/' + locale + '/partner/listings/new');
  const [d, cat] = await Promise.all([portalData(c, 1), c.repo.catalog()]);
  return (
    <>
      <Link href={'/' + locale + '/partner/listings'} className="text-sm text-ink/50 hover:underline">← {t.portal.listings.back}</Link>
      <PageHead title={t.portal.listings.new} />
      <ListingEditor locale={locale} partners={d.partners.map((p) => ({ id: p.id, name: p.name }))} destinations={cat.destinations.map((x) => ({ id: x.id, name: dname(x, locale as Lang) }))} />
    </>
  );
}
