export interface LatLon { lat: number; lon: number }

/** Great-circle distance in km (haversine). */
export function km(a: LatLon, b: LatLon): number {
  const R = 6371;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLon = r(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough road distance: straight line x 1.35 (mountain roads). Labelled as an estimate in UI. */
export const roadKmEstimate = (a: LatLon, b: LatLon) => Math.round(km(a, b) * 1.35);

export function openInMapsUrl(p: LatLon): string {
  return 'https:' + '//www.openstreetmap.org/?mlat=' + p.lat + '&mlon=' + p.lon + '#map=13/' + p.lat + '/' + p.lon;
}

export function googleDirectionsUrl(p: LatLon): string {
  // Deep link only (no scraping, no API key): opens the user's Google Maps app/site.
  return 'https:' + '//www.google.com/maps/dir/?api=1&destination=' + p.lat + ',' + p.lon;
}

const coord = (n: number) => { if (!Number.isFinite(n)) throw new Error('Invalid coordinate'); return Number(n.toFixed(6)); };

/** Yandex Maps route to a point (start = user's current location). rtext uses lat,lon. */
export function yandexDirectionsUrl(p: LatLon): string {
  return 'https:' + '//yandex.ru/maps/?rtext=~' + coord(p.lat) + '%2C' + coord(p.lon) + '&rtt=auto';
}

/** 2GIS route to a point. 2GIS expects lon,lat order. */
export function twoGisDirectionsUrl(p: LatLon): string {
  return 'https:' + '//2gis.kg/directions/points/%7C' + coord(p.lon) + '%2C' + coord(p.lat);
}

export type NavProvider = 'google' | 'yandex' | '2gis';
export function directionsUrl(provider: NavProvider, p: LatLon): string {
  if (provider === 'yandex') return yandexDirectionsUrl(p);
  if (provider === '2gis') return twoGisDirectionsUrl(p);
  return googleDirectionsUrl({ lat: coord(p.lat), lon: coord(p.lon) });
}
