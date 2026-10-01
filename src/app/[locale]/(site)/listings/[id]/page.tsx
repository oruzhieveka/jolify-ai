import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fmt, getDict } from '@/i18n/dict';
import { galleryFor } from '@/server/photos';
import { PhotoGallery } from '@/components/photo-gallery';
import { getCtx } from '@/server/context';
import { dname } from '@/core/catalog';
import { openInMapsUrl } from '@/core/geo';
import { DirectionsPicker } from '@/components/directions-picker';
import { usd } from '@/core/pricing';
import type { Lang } from '@/core/types';
import { Alert, Badge, Card, buttonClass } from '@/components/ui';
import { InquiryForm } from '@/components/inquiry-form';
import { TrackOnMount } from '@/components/page-view-tracker';
import { OutboundLink } from '@/components/outbound-link';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await (await getCtx()).repo.listing(id);
  return l && l.status === 'approved' ? { title: l.title, description: l.description.slice(0, 160) } : {};
}

export default async function ListingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const lang = locale as Lang; const t = getDict(locale);
  const c = await getCtx();
  const l = await c.repo.listing(id);
  if (!l || l.status !== 'approved') notFound(); // unapproved listings are never public
  const [cat, partners, photos] = await Promise.all([c.repo.catalog(), c.repo.partners(), galleryFor(c.repo, 'listing', id)]);
  const d = cat.dest(l.destinationId);
  const p = partners.find((x) => x.id === l.partnerId);
  const pos = l.lat != null && l.lon != null ? { lat: l.lat, lon: l.lon } : d ? { lat: d.lat, lon: d.lon } : null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <TrackOnMount type="listing_viewed" props={{ listing_id: l.id, partner_id: l.partnerId }} />
      <nav className="text-sm text-ink/50"><Link href={'/' + locale + '/marketplace/stay'}>{t.nav.marketplace}</Link>{d && <> / <Link href={'/' + locale + '/destinations/' + d.id}>{dname(d, lang)}</Link></>}</nav>
      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{t.categories[l.category]}</Badge>
            {l.isDemo && <Badge tone="warn">{t.sampleBadge}</Badge>}
            {p?.verified && <Badge tone="ok">{t.verified}</Badge>}
          </div>
          <h1 className="mt-2 text-3xl font-semibold">{l.title}</h1>
          {photos.length > 0 && <div className="mt-4"><PhotoGallery photos={photos} title={l.title} /></div>}
          {p && <p className="mt-1 text-ink/60">{p.name} · {p.city}</p>}
          <p className="mt-6 text-lg leading-relaxed text-ink/75">{l.description}</p>
          {l.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{l.tags.map((x) => <span key={x} className="rounded-full bg-ink/5 px-3 py-1 text-sm">{x}</span>)}</div>}
          {l.isDemo && <Alert tone="warn" className="mt-6">{t.sampleNotice}</Alert>}
          {pos && (
            <div className="mt-6 flex flex-wrap gap-2">
              <OutboundLink href={openInMapsUrl(pos)} className={buttonClass('outline', 'sm')} event={{ listing_id: l.id, target: 'osm' }}>{t.openInMaps}</OutboundLink>
              <DirectionsPicker lat={pos.lat} lon={pos.lon} destinationId={l.destinationId} className={buttonClass('outline', 'sm')} labels={{ button: t.howToGetThere, title: t.chooseNavApp, google: t.navGoogle, yandex: t.navYandex, twoGis: t.nav2gis, note: t.navNote }} />
              {l.lat == null && <span className="self-center text-xs text-ink/40">{fmt(t.locationApprox, { place: d ? dname(d, lang) : '' })}</span>}
            </div>
          )}
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div><span className="text-2xl font-semibold">{usd(l.priceUsd)}</span> <span className="text-sm text-ink/50">{t.units[l.unit]}</span></div>
            <p className="mt-1 text-xs text-ink/50">{t.priceNote}</p>
            <div className="mt-4">
              {c.user ? <InquiryForm listingId={l.id} today={today} />
                : <Link href={'/' + locale + '/login?next=' + encodeURIComponent('/' + locale + '/listings/' + l.id)} className={buttonClass('primary', 'md') + ' w-full'}>{t.nav.login} → {t.sendInquiry}</Link>}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
