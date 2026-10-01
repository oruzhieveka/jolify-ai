'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapView, type MapPoint } from './map-view';

type P = Omit<MapPoint, 'kind'>;
export function DestinationMap({ d, nearby, labels }: { d: P; nearby: P[]; labels: { loading: string; error: string; locate: string; map?: string; geoDenied?: string; geoFailed?: string; geoUnsupported?: string } }) {
  const [sel, setSel] = useState<string | null>(d.id);
  const r = useRouter(); const { locale } = useParams<{ locale: string }>();
  const points: MapPoint[] = [{ ...d, kind: 'destination' }, ...nearby.map((n) => ({ ...n, kind: 'experiences' }))];
  return <MapView points={points} selectedId={sel} onSelect={(id) => (id === d.id ? setSel(id) : r.push('/' + locale + '/destinations/' + id))} labels={labels} className="h-[360px]" />;
}
