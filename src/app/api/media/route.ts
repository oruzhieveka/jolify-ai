import { NextResponse } from 'next/server';
import { listPhotos, uploadPhoto } from '@/server/handlers-portal';
import { clientIp, getStorage } from '@/server/context';
import { PHOTO_RULES } from '@/core/media';
import { rateLimit } from '@/lib/rate-limit';
import { route } from '@/lib/route';

export const GET = route(async (c, _b, _p, req) => {
  const u = new URL(req.url);
  return listPhotos(c, await getStorage(), { owner_type: u.searchParams.get('owner_type'), owner_id: u.searchParams.get('owner_id') });
});

/** Multipart upload: file, owner_type, owner_id, alt?, caption? (+ author/license/source_url for curated photos). */
export const POST = route(async (c, _b, _p, req) => {
  const rl = rateLimit('upload:' + (c.user?.id ?? (await clientIp())), 30);
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads', code: 'rate_limited' }, { status: 429 });
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > PHOTO_RULES.maxUploadBytes + 64 * 1024) return NextResponse.json({ error: 'Too large', code: 'photo_too_large' }, { status: 413 });
  const fd = await req.formData().catch(() => null);
  const file = fd?.get('file');
  if (!fd || !(file instanceof File)) return NextResponse.json({ error: 'Missing file', code: 'photo_empty' }, { status: 400 });
  const s = (k: string) => { const v = fd.get(k); return typeof v === 'string' ? v : null; };
  return uploadPhoto(c, await getStorage(), {
    owner_type: s('owner_type') ?? '', owner_id: s('owner_id') ?? '', bytes: new Uint8Array(await file.arrayBuffer()), content_type: file.type,
    alt: s('alt'), caption: s('caption'), author: s('author'), license: s('license'), source_url: s('source_url'),
  });
}, { rawBody: true });
