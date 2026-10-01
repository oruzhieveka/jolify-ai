'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaOwnerType, MediaRow } from '@/core/media';
import { PHOTO_RULES } from '@/core/media';
import { errorText } from '@/i18n/dict';
import { useI18n } from '@/i18n/client';
import { api } from '@/lib/client';
import { optimizeImage, uploadWithProgress } from '@/lib/image-optimize';
import { Alert, Button, Input, Spinner } from '@/components/ui';

type Photo = MediaRow & { url: string };
type Job = { key: string; name: string; preview: string; state: 'optimizing' | 'uploading' | 'failed'; pct: number; error?: string; file: File };

/**
 * Full photo management for a listing, a business profile or (admin) a destination:
 * multi-upload with optimisation + progress, preview, delete, drag/keyboard reorder, cover, alt/caption.
 * Storage-agnostic: talks only to /api/media*, which uses Supabase Storage in production.
 */
export function PhotoManager({ ownerType, ownerId, demo, attribution = false, dark = false }: { ownerType: MediaOwnerType; ownerId: string; demo: boolean; attribution?: boolean; dark?: boolean }) {
  const { t, f } = useI18n(); const P = t.photos;
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [attr, setAttr] = useState({ author: '', license: '', source_url: '' });
  const input = useRef<HTMLInputElement>(null);
  const q = 'owner_type=' + ownerType + '&owner_id=' + encodeURIComponent(ownerId);

  const load = useCallback(async () => {
    const r = await api<{ photos: Photo[] }>('/api/media?' + q);
    if (r.ok) setPhotos(r.data.photos); else { setPhotos([]); setErr(errorText(t, r.data as { code?: string })); }
  }, [q, t]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => jobs.forEach((j) => URL.revokeObjectURL(j.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const patchJob = (key: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.key === key ? { ...j, ...p } : j)));

  async function run(job: Job) {
    patchJob(job.key, { state: 'optimizing', pct: 0, error: undefined });
    let blob: Blob;
    try { blob = (await optimizeImage(job.file)).blob; } catch (e) { patchJob(job.key, { state: 'failed', error: (t.errors as Record<string, string>)[(e as Error).message] ?? t.errors.photo_upload_failed }); return; }
    patchJob(job.key, { state: 'uploading', pct: 0 });
    const fd = new FormData();
    fd.set('file', new File([blob], job.name.replace(/\.\w+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg'), { type: blob.type }));
    fd.set('owner_type', ownerType); fd.set('owner_id', ownerId);
    if (attribution) { fd.set('author', attr.author); fd.set('license', attr.license); fd.set('source_url', attr.source_url); }
    const r = await uploadWithProgress('/api/media', fd, (pct) => patchJob(job.key, { pct }));
    if (!r.ok) { patchJob(job.key, { state: 'failed', error: r.data?.code === 'network' ? t.errors.network : errorText(t, r.data) }); return; }
    setJobs((js) => js.filter((j) => j.key !== job.key)); URL.revokeObjectURL(job.preview);
    setPhotos((ps) => [...(ps ?? []), r.data.photo as Photo]);
  }

  function add(files: FileList | File[]) {
    setErr(null);
    const room = PHOTO_RULES.maxPerOwner - (photos?.length ?? 0) - jobs.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (Array.from(files).length > list.length) setErr(t.errors.photo_limit);
    const fresh = list.map((file, i): Job => ({ key: Date.now() + '-' + i + '-' + file.name, name: file.name, preview: URL.createObjectURL(file), state: 'optimizing', pct: 0, file }));
    setJobs((js) => [...js, ...fresh]);
    (async () => { for (const j of fresh) await run(j); })(); // sequential: friendlier on mobile networks
  }

  async function saveOrder(next: Photo[], coverId?: string) {
    const prev = photos;
    setPhotos(next.map((p, i) => ({ ...p, position: i, is_cover: coverId ? p.id === coverId : p.is_cover }))); // optimistic
    const r = await api<{ photos: Photo[] }>('/api/media/order', { owner_type: ownerType, owner_id: ownerId, ids: next.map((p) => p.id), cover_id: coverId ?? next.find((p) => p.is_cover)?.id ?? null }, 'PUT');
    if (r.ok) setPhotos(r.data.photos); else { setPhotos(prev); setErr(errorText(t, r.data as { code?: string })); }
  }
  const move = (i: number, d: -1 | 1) => { if (!photos) return; const n = [...photos]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; void saveOrder(n); };
  async function remove(p: Photo) {
    if (!confirm(P.confirmDelete)) return;
    const r = await api<{ photos: Photo[] }>('/api/media/' + p.id, undefined, 'DELETE');
    if (r.ok) setPhotos(r.data.photos); else setErr(errorText(t, r.data as { code?: string }));
  }
  function onDrop(target: string) {
    if (!photos || !drag || drag === target) return;
    const n = photos.filter((p) => p.id !== drag); const at = n.findIndex((p) => p.id === target);
    n.splice(at, 0, photos.find((p) => p.id === drag)!); setDrag(null); void saveOrder(n);
  }

  const muted = dark ? 'text-snow/50' : 'text-ink/50';
  const card = dark ? 'border-white/10 bg-night-700' : 'border-ink/10 bg-white';
  return (
    <div className="space-y-4">
      {demo && <Alert tone="warn">{P.storageDemo}</Alert>}
      {attribution && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input aria-label={P.author} placeholder={P.author} value={attr.author} onChange={(e) => setAttr({ ...attr, author: e.target.value })} />
          <Input aria-label={P.license} placeholder={P.license} value={attr.license} onChange={(e) => setAttr({ ...attr, license: e.target.value })} />
          <Input aria-label={P.source} placeholder={P.source} value={attr.source_url} onChange={(e) => setAttr({ ...attr, source_url: e.target.value })} />
        </div>
      )}
      <div onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setOver(false); add(e.dataTransfer.files); } }}
        className={'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ' + (over ? 'border-apricot-500 bg-apricot-100/40' : dark ? 'border-white/15' : 'border-ink/15')}>
        <p className="text-sm font-medium">{P.drop}</p>
        <p className={'max-w-md text-xs ' + muted}>{P.hint}</p>
        <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={(photos?.length ?? 0) + jobs.length >= PHOTO_RULES.maxPerOwner || (attribution && (!attr.author || !attr.license))}>{P.add}</Button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }} />
      </div>
      {err && <Alert tone="error">{err}</Alert>}

      {jobs.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.key} className={'overflow-hidden rounded-xl border ' + card}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={j.preview} alt="" className="aspect-[4/3] w-full object-cover opacity-60" />
              <div className="space-y-1 p-2 text-xs">
                {j.state === 'optimizing' && <span className="flex items-center gap-1"><Spinner className="h-3 w-3" />{P.optimizing}</span>}
                {j.state === 'uploading' && <><span>{f(P.uploading, { p: j.pct })}</span><div className="h-1 rounded bg-ink/10"><div className="h-1 rounded bg-apricot-500 transition-all" style={{ width: j.pct + '%' }} /></div></>}
                {j.state === 'failed' && <><p className="text-red-600">{j.error}</p><div className="flex gap-2"><button type="button" className="font-medium underline" onClick={() => run(j)}>{P.retry}</button><button type="button" className={muted} onClick={() => setJobs((js) => js.filter((x) => x.key !== j.key))}>{t.common.close}</button></div></>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {photos === null ? <div className={'flex items-center gap-2 text-sm ' + muted}><Spinner />{t.common.loading}</div> : photos.length === 0 && !jobs.length ? <p className={'text-sm ' + muted}>{P.empty}</p> : (
        <>
          <p className={'text-xs ' + muted}>{P.dragHint}</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p, i) => (
              <li key={p.id} draggable onDragStart={() => setDrag(p.id)} onDragOver={(e) => drag && e.preventDefault()} onDrop={() => onDrop(p.id)} onDragEnd={() => setDrag(null)}
                className={'overflow-hidden rounded-xl border ' + card + (drag === p.id ? ' opacity-40' : '') + (p.is_cover ? ' ring-2 ring-apricot-500' : '')}>
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt ?? ''} loading="lazy" className="aspect-[4/3] w-full cursor-grab object-cover" />
                  {p.is_cover && <span className="absolute left-2 top-2 rounded-full bg-apricot-500 px-2 py-0.5 text-xs font-semibold text-ink">{P.cover}</span>}
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{i + 1}</span>
                </div>
                <div className="space-y-2 p-3">
                  <p className={'text-xs ' + muted}>{p.width && p.height ? f(P.size, { w: p.width, h: p.height, kb: Math.round((p.bytes ?? 0) / 1024) }) : ''}{p.author ? ' · © ' + p.author + (p.license ? ' (' + p.license + ')' : '') : ''}</p>
                  <MetaEditor photo={p} onSaved={(np) => setPhotos((ps) => ps!.map((x) => (x.id === np.id ? { ...x, ...np } : x)))} />
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" size="sm" variant="outline" aria-label={P.moveLeft} disabled={i === 0} onClick={() => move(i, -1)}>←</Button>
                    <Button type="button" size="sm" variant="outline" aria-label={P.moveRight} disabled={i === photos.length - 1} onClick={() => move(i, 1)}>→</Button>
                    {!p.is_cover && <Button type="button" size="sm" variant="outline" onClick={() => saveOrder(photos, p.id)}>{P.makeCover}</Button>}
                    <Button type="button" size="sm" variant="danger" onClick={() => remove(p)}>{P.remove}</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function MetaEditor({ photo, onSaved }: { photo: Photo; onSaved: (p: Photo) => void }) {
  const { t } = useI18n(); const P = t.photos;
  const [alt, setAlt] = useState(photo.alt ?? ''); const [caption, setCaption] = useState(photo.caption ?? '');
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const dirty = alt !== (photo.alt ?? '') || caption !== (photo.caption ?? '');
  async function save() {
    setState('busy');
    const r = await api<{ photo: Photo }>('/api/media/' + photo.id, { alt, caption }, 'PATCH');
    if (r.ok) { setState('ok'); onSaved({ ...photo, ...r.data.photo, url: photo.url }); } else setState('err');
  }
  return (
    <div className="space-y-1.5">
      <Input aria-label={P.alt} placeholder={P.alt} maxLength={PHOTO_RULES.altMax} value={alt} onChange={(e) => { setAlt(e.target.value); setState('idle'); }} className="h-8 text-xs" />
      <Input aria-label={P.caption} placeholder={P.caption} maxLength={PHOTO_RULES.captionMax} value={caption} onChange={(e) => { setCaption(e.target.value); setState('idle'); }} className="h-8 text-xs" />
      {(dirty || state !== 'idle') && <div className="flex items-center gap-2 text-xs">{dirty && <Button type="button" size="sm" onClick={save} disabled={state === 'busy'}>{state === 'busy' && <Spinner className="h-3 w-3" />}{P.saveMeta}</Button>}{state === 'ok' && <span className="text-steppe-600">{P.metaSaved}</span>}{state === 'err' && <span className="text-red-600">{t.errors.generic}</span>}</div>}
    </div>
  );
}
