'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { Map as MLMap, GeoJSONSource, Marker } from 'maplibre-gl';
import { mapStyle } from '@/lib/map-provider';
import { track } from '@/lib/client';

export interface MapPoint { id: string; lat: number; lon: number; title: string; kind: string; subtitle?: string; order?: number }

const KIND_COLOR: Record<string, string> = { destination: '#1663a3', stay: '#f08a24', eat: '#d94f4f', tours: '#4f8a3b', guides: '#7c4dbd', transport: '#475569', experiences: '#0e9f9a', day: '#0b1220' };
const KG_BOUNDS: [[number, number], [number, number]] = [[69.2, 39.1], [80.3, 43.3]];

export interface MapViewProps {
  points: MapPoint[];
  route?: [number, number][]; // [lon, lat]
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  cluster?: boolean;
  numbered?: boolean;
  labels: { loading: string; error: string; locate: string; map?: string; geoDenied?: string; geoFailed?: string; geoUnsupported?: string };
  className?: string;
}

/**
 * MapLibre GL map with clustering, a route line, numbered stops and geolocation.
 * Tiles come from the provider configured in NEXT_PUBLIC_MAP_PROVIDER (see lib/map-provider.ts).
 */
export function MapView({ points, route, selectedId, onSelect, cluster = false, numbered = false, labels, className }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const markers = useRef<Marker[]>([]);
  const me = useRef<Marker | null>(null);
  const bound = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // create map once
  useEffect(() => {
    let cancelled = false;
    import('maplibre-gl').then((ml) => {
      if (cancelled || !el.current) return;
      lib.current = ml;
      const m = new ml.Map({ container: el.current, style: mapStyle() as never, bounds: KG_BOUNDS, attributionControl: { compact: true }, cooperativeGestures: false });
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      m.on('load', () => { if (!cancelled) { map.current = m; setState('ready'); } });
      m.on('error', (e) => { if (!m.loaded() && !cancelled) { console.warn('map error', e?.error); setState('error'); } });
      track('map_opened', {});
    }).catch(() => setState('error'));
    return () => { cancelled = true; map.current?.remove(); map.current = null; };
  }, []);

  // data layers
  const key = JSON.stringify([points.map((p) => p.id + p.lat + p.lon), route]);
  useEffect(() => {
    const m = map.current, ml = lib.current;
    if (!m || !ml || state !== 'ready') return;
    markers.current.forEach((x) => x.remove()); markers.current = [];
    for (const id of ['route-line', 'clusters', 'cluster-count', 'pts']) if (m.getLayer(id)) m.removeLayer(id);
    for (const id of ['route', 'points']) if (m.getSource(id)) m.removeSource(id);

    if (route && route.length > 1) {
      m.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#f08a24', 'line-width': 4, 'line-dasharray': [1, 1.5] } });
    }

    if (numbered) {
      for (const p of points) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-ink text-xs font-bold text-white shadow-lg';
        d.textContent = String(p.order ?? '');
        d.setAttribute('aria-label', p.title);
        d.onclick = () => onSelectRef.current?.(p.id);
        markers.current.push(new ml.Marker({ element: d }).setLngLat([p.lon, p.lat]).addTo(m));
      }
    } else {
      m.addSource('points', {
        type: 'geojson', cluster, clusterRadius: 44, clusterMaxZoom: 9,
        data: { type: 'FeatureCollection', features: points.map((p) => ({ type: 'Feature', properties: { id: p.id, title: p.title, kind: p.kind, subtitle: p.subtitle ?? '', color: KIND_COLOR[p.kind] ?? '#1663a3' }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) },
      });
      if (cluster) {
        m.addLayer({ id: 'clusters', type: 'circle', source: 'points', filter: ['has', 'point_count'], paint: { 'circle-color': '#0b1220', 'circle-opacity': 0.85, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
        m.addLayer({ id: 'cluster-count', type: 'symbol', source: 'points', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#fff' } });
        if (!bound.current) m.on('click', 'clusters', async (e) => {
          const f = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
          const src = m.getSource('points') as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties?.cluster_id);
          m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom });
        });
      }
      m.addLayer({ id: 'pts', type: 'circle', source: 'points', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['get', 'color'], 'circle-radius': 8, 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } });
      if (!bound.current) {
        bound.current = true; // layer-scoped listeners survive removeLayer/addLayer, so bind once
        m.on('click', 'pts', (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) { onSelectRef.current?.(String(id)); track('map_marker_clicked', { id }); }
        });
        for (const l of ['pts', 'clusters']) {
          m.on('mouseenter', l, () => { m.getCanvas().style.cursor = 'pointer'; });
          m.on('mouseleave', l, () => { m.getCanvas().style.cursor = ''; });
        }
      }
    }

    const all = [...points.map((p) => [p.lon, p.lat] as [number, number]), ...(route ?? [])];
    if (all.length) {
      const b = new ml.LngLatBounds(all[0], all[0]);
      all.forEach((c) => b.extend(c));
      m.fitBounds(b, { padding: 60, maxZoom: all.length === 1 ? 10 : 9, duration: 600 });
    }
  }, [key, state, cluster, numbered]); // eslint-disable-line react-hooks/exhaustive-deps

  // selection -> fly + popup
  useEffect(() => {
    const m = map.current, ml = lib.current;
    if (!m || !ml || !selectedId) return;
    const p = points.find((x) => x.id === selectedId);
    if (!p) return;
    m.flyTo({ center: [p.lon, p.lat], zoom: Math.max(m.getZoom(), 8), duration: 700 });
    const pop = new ml.Popup({ closeButton: false, offset: 14 }).setLngLat([p.lon, p.lat]);
    const box = document.createElement('div');
    const h = document.createElement('div'); h.className = 'font-semibold text-sm'; h.textContent = p.title;
    const s = document.createElement('div'); s.className = 'text-xs text-slate-500'; s.textContent = p.subtitle ?? '';
    box.append(h, s); pop.setDOMContent(box).addTo(m);
    return () => { pop.remove(); };
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function locate() {
    if (!navigator.geolocation) { setGeoMsg(labels.geoUnsupported ?? null); return; }
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const m = map.current, ml = lib.current;
        if (!m || !ml) return;
        const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        me.current?.remove();
        const dot = document.createElement('div');
        dot.className = 'h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow ring-4 ring-blue-500/30';
        me.current = new ml.Marker({ element: dot }).setLngLat(c).addTo(m);
        m.flyTo({ center: c, zoom: 10 });
      },
      (e) => setGeoMsg((e.code === e.PERMISSION_DENIED ? labels.geoDenied : labels.geoFailed) ?? null),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className={'relative overflow-hidden rounded-2xl bg-night-800 ' + (className ?? 'h-[420px]')}>
      <div ref={el} className="absolute inset-0" aria-label={labels.map} role="region" />
      {state === 'loading' && <div className="absolute inset-0 grid place-items-center text-sm text-snow/60">{labels.loading}</div>}
      {state === 'error' && <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-snow/70">{labels.error}</div>}
      {state === 'ready' && (
        <button type="button" onClick={locate} className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-md hover:bg-snow">
          {labels.locate}
        </button>
      )}
      {geoMsg && <div className="absolute bottom-12 left-3 rounded-lg bg-white px-3 py-1.5 text-xs shadow">{geoMsg}</div>}
    </div>
  );
}
