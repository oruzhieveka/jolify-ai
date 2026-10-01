import type { Metadata } from 'next';
import { getDict, fact } from '@/i18n/dict';
import { getRepo } from '@/server/context';
import { dname } from '@/core/catalog';
import { MARKET_SECTIONS, type Lang, type MarketSection } from '@/core/types';
import { usd } from '@/core/pricing';
import { MapExplorer, type ExplorerItem } from '@/components/map-explorer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const t = getDict(locale);
  return { title: t.nav.map, alternates: { canonical: '/' + locale + '/map' } };
}

const sectionOf = (cat: string): MarketSection => (Object.entries(MARKET_SECTIONS).find(([, v]) => (v as readonly string[]).includes(cat))?.[0] ?? 'experiences') as MarketSection;

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale as Lang; const t = getDict(locale);
  const cat = await (await getRepo()).catalog();
  const items: ExplorerItem[] = [
    ...cat.destinations.map((d) => ({ id: d.id, kind: 'destination', title: dname(d, lang), subtitle: fact(t, 'regions', d.region), region: d.region, lat: d.lat, lon: d.lon, approx: false, href: '/' + locale + '/destinations/' + d.id, demo: false })),
    ...cat.approved().flatMap((l) => {
      const d = cat.dest(l.destinationId);
      if (!d) return [];
      const has = l.lat != null && l.lon != null;
      return [{
        id: l.id, kind: sectionOf(l.category), title: l.title, subtitle: dname(d, lang) + ' · ' + usd(l.priceUsd) + ' ' + t.units[l.unit], region: d.region,
        lat: has ? l.lat! : d.lat, lon: has ? l.lon! : d.lon, approx: !has, href: '/' + locale + '/listings/' + l.id, demo: l.isDemo,
      }];
    }),
  ];
  const regionLabels = Object.fromEntries(cat.destinations.map((d) => [d.region, fact(t, 'regions', d.region)]));
  const kinds = ['destination', ...Object.keys(MARKET_SECTIONS)];
  const kindLabels: Record<string, string> = { destination: t.nav.destinations, stay: t.stay, eat: t.eat, tours: t.tours, guides: t.guides, transport: t.transport, experiences: t.experiences };
  return (
    <MapExplorer items={items} kinds={kinds} kindLabels={kindLabels} regionLabels={regionLabels}
      labels={{ loading: t.mapLoading, error: t.mapError, locate: t.locateMe, filters: t.filters, all: t.all, results: t.results, approx: t.mapApprox, sample: t.sampleBadge, search: t.searchPlaces, region: t.region, title: t.nav.map, open: t.openInMaps, details: t.mapDetails, map: t.mapLabel, geoDenied: t.geoDenied, geoFailed: t.geoFailed, geoUnsupported: t.geoUnsupported, directions: t.howToGetThere, chooseNavApp: t.chooseNavApp, navGoogle: t.navGoogle, navYandex: t.navYandex, nav2gis: t.nav2gis, navNote: t.navNote }} />
  );
}
