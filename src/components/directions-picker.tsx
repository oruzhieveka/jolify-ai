'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { directionsUrl, type NavProvider } from '@/core/geo';
import { track } from '@/lib/client';

type Labels = { button: string; title: string; google: string; yandex: string; twoGis: string; note: string };

/** "How to get there": user picks Google Maps, Yandex Maps or 2GIS; we open a real deep link with the coordinates. */
export function DirectionsPicker({ lat, lon, destinationId, labels, className }: { lat: number; lon: number; destinationId: string; labels: Labels; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const items: [NavProvider, string][] = [['google', labels.google], ['yandex', labels.yandex], ['2gis', labels.twoGis]];
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" className={className} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((v) => !v)}>{labels.button}</button>
      {open && (
        <div id={menuId} role="menu" aria-label={labels.title} className="absolute left-0 z-30 mt-2 w-60 rounded-xl border border-ink/10 bg-paper p-2 shadow-lg">
          <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-ink/50">{labels.title}</p>
          {items.map(([p, label]) => (
            <a key={p} role="menuitem" href={directionsUrl(p, { lat, lon })} target="_blank" rel="noopener noreferrer"
              className="block rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-ink/5 focus-visible:bg-ink/5"
              onClick={() => { track('open_in_maps_clicked', { destination_id: destinationId, target: p }); setOpen(false); }}>{label}</a>
          ))}
          <p className="px-2 pt-1 text-xs text-ink/50">{labels.note}</p>
        </div>
      )}
    </div>
  );
}
