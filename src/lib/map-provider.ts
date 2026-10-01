/**
 * Switchable map style. Rendering is MapLibre GL in every case (one code path, no vendor lock-in).
 * - mapbox:      Mapbox "dark-v11" via the Mapbox Static Tiles API (raster, retina). Needs NEXT_PUBLIC_MAPBOX_TOKEN
 *                (a public pk.* token restricted to your domain in the Mapbox dashboard). Default when a token is set.
 * - openfreemap: free, no key (fallback when no Mapbox token).
 * - maptiler / custom: as before.
 */
export type MapStyle = string | Record<string, unknown>;
type Env = Record<string, string | undefined>;

export function mapProvider(e: Env = process.env): 'mapbox' | 'maptiler' | 'custom' | 'openfreemap' {
  const p = e.NEXT_PUBLIC_MAP_PROVIDER;
  if (p === 'custom' && e.NEXT_PUBLIC_MAP_STYLE_URL) return 'custom';
  if (p === 'maptiler' && e.NEXT_PUBLIC_MAPTILER_KEY) return 'maptiler';
  if ((p === 'mapbox' || !p) && e.NEXT_PUBLIC_MAPBOX_TOKEN) return 'mapbox';
  return 'openfreemap';
}

export function mapboxDarkStyle(token: string, styleId = 'mapbox/dark-v11'): Record<string, unknown> {
  if (!/^pk\./.test(token)) throw new Error('Mapbox token must be a public pk.* token');
  return {
    version: 8,
    sources: {
      mapbox: {
        type: 'raster', tileSize: 512, maxzoom: 18,
        tiles: ['https:' + '//api.mapbox.com/styles/v1/' + styleId + '/tiles/512/{z}/{x}/{y}@2x?access_token=' + encodeURIComponent(token)],
        attribution: '© Mapbox © OpenStreetMap',
      },
    },
    layers: [{ id: 'mapbox', type: 'raster', source: 'mapbox' }],
  };
}

// NEXT_PUBLIC_* must be referenced literally so Next.js inlines them into the client bundle.
const clientEnv = (): Env => ({
  NEXT_PUBLIC_MAP_PROVIDER: process.env.NEXT_PUBLIC_MAP_PROVIDER,
  NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  NEXT_PUBLIC_MAPTILER_KEY: process.env.NEXT_PUBLIC_MAPTILER_KEY,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NEXT_PUBLIC_MAPBOX_STYLE: process.env.NEXT_PUBLIC_MAPBOX_STYLE,
});

export function mapStyle(e: Env = clientEnv()): MapStyle {
  switch (mapProvider(e)) {
    case 'mapbox': return mapboxDarkStyle(e.NEXT_PUBLIC_MAPBOX_TOKEN!, e.NEXT_PUBLIC_MAPBOX_STYLE || 'mapbox/dark-v11');
    case 'custom': return e.NEXT_PUBLIC_MAP_STYLE_URL!;
    case 'maptiler': return 'https:' + '//api.maptiler.com/maps/dataviz-dark/style.json?key=' + e.NEXT_PUBLIC_MAPTILER_KEY;
    default: return 'https:' + '//tiles.openfreemap.org/styles/dark';
  }
}
/** Back-compat alias. */
export const mapStyleUrl = mapStyle;
export const mapAttribution = 'OpenStreetMap contributors';
