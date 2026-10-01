'use client';
import { useState } from 'react';
import { useI18n } from '@/i18n/client';

export interface GalleryPhoto { id: string; url: string; alt: string | null; caption: string | null; width: number | null; height: number | null; author: string | null; license: string | null; source_url: string | null }

/** Public photo gallery: cover first, thumbnails, keyboard accessible, attribution for curated photos. */
export function PhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  if (!photos.length) return null;
  const p = photos[Math.min(i, photos.length - 1)];
  return (
    <figure className="overflow-hidden rounded-2xl bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.url} alt={p.alt || title} width={p.width ?? undefined} height={p.height ?? undefined} className="aspect-[16/10] w-full object-cover" fetchPriority={i === 0 ? 'high' : 'auto'} />
      {(p.caption || p.author) && (
        <figcaption className="flex flex-wrap justify-between gap-2 px-4 py-2 text-xs text-snow/70">
          <span>{p.caption}</span>
          {p.author && <span>© {p.source_url ? <a className="underline" href={p.source_url} target="_blank" rel="noopener noreferrer">{p.author}</a> : p.author}{p.license ? ' · ' + p.license : ''}</span>}
        </figcaption>
      )}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2" role="list" aria-label={t.photos.title}>
          {photos.map((x, n) => (
            <button key={x.id} role="listitem" onClick={() => setI(n)} aria-current={n === i ? 'true' : undefined} aria-label={(x.alt || title) + ' ' + (n + 1)}
              className={'h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 ' + (n === i ? 'ring-apricot-500' : 'ring-transparent opacity-70 hover:opacity-100')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
