import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDict, fact, fmt } from '@/i18n/dict';
import { localizeDestination } from '@/core/localize';
import { galleryFor, coverUrls } from '@/server/photos';
import { PhotoGallery } from '@/components/photo-gallery';
import { getRepo } from '@/server/context';
import { dname } from '@/core/catalog';
import { km, openInMapsUrl } from '@/core/geo';
import { DirectionsPicker } from '@/components/directions-picker';
import type { Lang } from '@/core/types';
import { env } from '@/lib/env';
import { Card, buttonClass } from '@/components/ui';
import { ListingCard } from '@/components/listing-card';
import { DestinationMap } from '@/components/destination-map';
import { TrackOnMount } from '@/components/page-view-tracker';
import { OutboundLink } from '@/components/outbound-link';

async function load(slug: string) {
  const repo = await getRepo();
  const [cat, partners] = await Promise.all([repo.catalog(), repo.partners()]);
  return { repo, cat, partners, d: cat.dest(slug) };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const { d } = await load(slug);
  if (!d) return {};
  const loc = localizeDestination(d, locale as Lang);
  const desc = loc.description.slice(0, 160);
  return {
    title: loc.name, description: desc,
    alternates: { canonical: '/' + locale + '/destinations/' + d.id, languages: { en: '/en/destinations/' + d.id, ru: '/ru/destinations/' + d.id, ky: '/ky/destinations/' + d.id } },
    openGraph: { title: loc.name + ' · Jolify AI', description: desc, type: 'article' },
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const lang = locale as Lang; const t = getDict(locale);
  const { repo, cat, partners, d } = await load(slug);
  if (!d) notFound();
  const loc = localizeDestination(d, lang);
  const listings = cat.approved().filter((l) => l.destinationId === d.id);
  const nearby = (d.details?.nearby?.map((id) => cat.dest(id)).filter((x) => !!x) ?? cat.nearby(d.id, 120).slice(0, 4));
  const det = loc.details ?? {};
  const [photos, covers] = await Promise.all([galleryFor(repo, 'destination', d.id), coverUrls(repo, 'listing', listings.map((l) => l.id))]);
  const fb = (k: string) => (loc.fallback.includes(k) ? 'en' : undefined);
  const jsonLd = {
    '@context': 'https:' + '//schema.org', '@type': 'TouristDestination', name: loc.name, description: loc.description,
    geo: { '@type': 'GeoCoordinates', latitude: d.lat, longitude: d.lon }, containedInPlace: { '@type': 'AdministrativeArea', name: d.region + ', Kyrgyzstan' },
    url: env.siteUrl + '/' + locale + '/destinations/' + d.id,
  };
  const facts: [string, string | undefined][] = [
    [t.bestTime, fact(t, 'seasons', d.season)], [t.duration, fact(t, 'durations', d.duration)], [t.difficulty, d.difficulty ? fact(t, 'difficulty', d.difficulty) : undefined], [t.altitude, det.altitudeM ? det.altitudeM.toLocaleString(lang === 'en' ? 'en-US' : 'ru-RU') + ' ' + t.unitM : undefined],
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <TrackOnMount type="destination_viewed" props={{ destination_id: d.id }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\u003c') }} />
      <nav className="text-sm text-ink/50"><Link href={'/' + locale + '/destinations'}>{t.nav.destinations}</Link> / {fact(t, 'regions', d.region)}</nav>
      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div>
          <h1 className="text-4xl font-semibold">{loc.name}</h1>
          <p className="mt-4 text-lg text-ink/70" lang={fb('description')}>{loc.description}</p>
          {loc.fallback.length > 0 && <p className="mt-2 text-xs text-ink/50">{t.translationMissing}</p>}
          {photos.length > 0 && <div className="mt-6"><PhotoGallery photos={photos} title={t.photos.title} /></div>}
          <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {facts.filter(([, v]) => v).map(([k, v]) => <Card key={k} className="p-3"><dt className="text-xs text-ink/50">{k}</dt><dd className="font-medium">{v}</dd></Card>)}
          </dl>
          {det.howToGetThere && <Block title={t.howToGetThere} lang={fb('howToGetThere')}>{det.howToGetThere}</Block>}
          {det.history && <Block title={t.history} lang={fb('history')}>{det.history}</Block>}
          {det.culture && <Block title={t.culture} lang={fb('culture')}>{det.culture}</Block>}
          {(det.safety || loc.tips.length > 0) && (
            <Block title={t.safety} lang={fb('tips')}>{det.safety}{loc.tips.length > 0 && <ul className="mt-2 list-disc pl-5">{loc.tips.map((x, i) => <li key={i}>{x}</li>)}</ul>}</Block>
          )}
          {loc.activities.length > 0 && <Block title={t.activities} lang={fb('activities')}><div className="flex flex-wrap gap-2">{loc.activities.map((a) => <span key={a} className="rounded-full bg-ink/5 px-3 py-1 text-sm">{a}</span>)}</div></Block>}

          <h2 className="mt-10 text-xl font-semibold">{t.listingsHere}</h2>
          {listings.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{listings.map((l) => <ListingCard key={l.id} l={l} partner={partners.find((p) => p.id === l.partnerId)} locale={locale} t={t} cover={covers[l.id]} />)}</div>
          ) : <p className="mt-2 text-sm text-ink/50">{t.noListings}</p>}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <DestinationMap d={{ id: d.id, lat: d.lat, lon: d.lon, title: loc.name, subtitle: fact(t, 'regions', d.region) }} nearby={nearby.map((n) => ({ id: n.id, lat: n.lat, lon: n.lon, title: dname(n, lang), subtitle: Math.round(km(d, n)) + ' ' + t.unitKm }))} labels={{ loading: t.mapLoading, error: t.mapError, locate: t.locateMe, map: t.mapLabel, geoDenied: t.geoDenied, geoFailed: t.geoFailed, geoUnsupported: t.geoUnsupported }} />
          <div className="flex flex-wrap gap-2">
            <OutboundLink href={openInMapsUrl(d)} className={buttonClass('outline', 'sm')} event={{ destination_id: d.id, target: 'osm' }}>{t.openInMaps}</OutboundLink>
            <DirectionsPicker lat={d.lat} lon={d.lon} destinationId={d.id} className={buttonClass('outline', 'sm')} labels={{ button: t.howToGetThere, title: t.chooseNavApp, google: t.navGoogle, yandex: t.navYandex, twoGis: t.nav2gis, note: t.navNote }} />
            <Link href={'/' + locale + '/plan?q=' + encodeURIComponent(fmt(t.planIncluding, { place: loc.name }))} className={buttonClass('primary', 'sm')}>{t.plan}</Link>
          </div>
          {nearby.length > 0 && (
            <Card className="p-4"><h2 className="font-semibold">{t.nearby}</h2>
              <ul className="mt-2 space-y-1 text-sm">{nearby.map((n) => <li key={n.id} className="flex justify-between"><Link className="hover:underline" href={'/' + locale + '/destinations/' + n.id}>{dname(n, lang)}</Link><span className="text-ink/50">~{Math.round(km(d, n))} {t.unitKm}</span></li>)}</ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Block({ title, lang, children }: { title: string; lang?: string; children: React.ReactNode }) {
  return <section className="mt-8" lang={lang}><h2 className="text-xl font-semibold">{title}</h2><div className="mt-2 leading-relaxed text-ink/75">{children}</div></section>;
}
