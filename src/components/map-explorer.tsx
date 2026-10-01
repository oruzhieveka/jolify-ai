'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { openInMapsUrl } from '@/core/geo';
import { MapView, type MapPoint } from './map-view';
import { Badge, Input, Select } from './ui';
import { DirectionsPicker } from './directions-picker';
import { track } from '@/lib/client';

export interface ExplorerItem { id: string; kind: string; title: string; subtitle: string; region: string; lat: number; lon: number; approx: boolean; href: string; demo: boolean }

export function MapExplorer({ items, kinds, kindLabels, regionLabels = {}, labels }: {
  items: ExplorerItem[]; kinds: string[]; kindLabels: Record<string, string>; regionLabels?: Record<string, string>;
  labels: { loading: string; error: string; locate: string; filters: string; all: string; results: string; approx: string; sample: string; search: string; region: string; title: string; open: string;
    details: string; map: string; geoDenied: string; geoFailed: string; geoUnsupported: string; directions: string; chooseNavApp: string; navGoogle: string; navYandex: string; nav2gis: string; navNote: string };
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [region, setRegion] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const regions = useMemo(() => [...new Set(items.map((i) => i.region))].sort(), [items]);
  const shown = useMemo(() => items.filter((i) => (!kind || i.kind === kind) && (!region || i.region === region) && (!q || (i.title + ' ' + i.subtitle).toLowerCase().includes(q.toLowerCase()))), [items, kind, region, q]);
  const points: MapPoint[] = useMemo(() => shown.map((i) => ({ id: i.id, lat: i.lat, lon: i.lon, title: i.title, subtitle: i.subtitle, kind: i.kind })), [shown]);

  function select(id: string, fromMap = false) {
    setSel(id);
    if (fromMap) listRef.current?.querySelector('[data-id="' + CSS.escape(id) + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-6 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col">
        <h1 className="text-2xl font-semibold">{labels.title}</h1>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label={labels.filters}>
          <Chip on={!kind} onClick={() => setKind(null)}>{labels.all}</Chip>
          {kinds.map((k) => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{kindLabels[k] ?? k}</Chip>)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input aria-label={labels.search} placeholder={labels.search} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select aria-label={labels.region} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">{labels.region}: {labels.all}</option>
            {regions.map((r) => <option key={r} value={r}>{regionLabels[r] ?? r}</option>)}
          </Select>
        </div>
        <div className="mt-2 text-xs text-ink/50" aria-live="polite">{shown.length} {labels.results}</div>
        <ul ref={listRef} className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 max-lg:max-h-[45vh]">
          {shown.map((i) => (
            <li key={i.id} data-id={i.id}>
              <div className={'rounded-xl border p-3 transition ' + (sel === i.id ? 'border-glacier-500 bg-glacier-50' : 'border-ink/10 bg-white hover:border-ink/25')}>
                <button type="button" className="w-full text-left" onClick={() => select(i.id)}>
                  <div className="flex items-center gap-2 text-xs text-ink/50">{kindLabels[i.kind] ?? i.kind}{i.demo && <Badge tone="warn">{labels.sample}</Badge>}</div>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-ink/60">{i.subtitle}</div>
                  {i.approx && <div className="mt-1 text-[11px] text-ink/40">{labels.approx}</div>}
                </button>
                {sel === i.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium">
                    <Link href={i.href} className="text-glacier-700 hover:underline">{labels.details} →</Link>
                    <DirectionsPicker lat={i.lat} lon={i.lon} destinationId={i.id} className="text-glacier-700 hover:underline"
                      labels={{ button: labels.directions, title: labels.chooseNavApp, google: labels.navGoogle, yandex: labels.navYandex, twoGis: labels.nav2gis, note: labels.navNote }} />
                    <a href={openInMapsUrl(i)} target="_blank" rel="noopener noreferrer" className="text-glacier-700 hover:underline" onClick={() => track('open_in_maps_clicked', { id: i.id })}>{labels.open}</a>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <MapView points={points} cluster selectedId={sel} onSelect={(id) => select(id, true)} labels={labels} className="h-[55vh] lg:h-full" />
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={'rounded-full px-3 py-1 text-xs font-medium transition ' + (on ? 'bg-ink text-white' : 'bg-ink/5 text-ink/70 hover:bg-ink/10')}>{children}</button>;
}
