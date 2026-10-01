'use client';
import { PHOTO_RULES } from '@/core/media';

/**
 * Browser-side optimisation before upload: honours EXIF orientation, scales the long edge to
 * PHOTO_RULES.maxEdgePx and re-encodes as WebP (JPEG fallback). Keeps uploads small enough for
 * serverless body limits and strips location metadata (EXIF GPS) from partner photos.
 */
export async function optimizeImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.size > PHOTO_RULES.maxOriginalBytes) throw new Error('photo_too_large');
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error('photo_type');
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error('photo_type'); }
  const scale = Math.min(1, PHOTO_RULES.maxEdgePx / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale), height = Math.round(bmp.height * scale);
  if (Math.max(width, height) < PHOTO_RULES.minEdgePx) { bmp.close(); throw new Error('photo_too_small'); }
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('photo_upload_failed');
  ctx.drawImage(bmp, 0, 0, width, height); bmp.close();
  const encode = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await encode('image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85); // Safari < 16 cannot encode WebP
  for (let q = 0.72; blob && blob.size > PHOTO_RULES.maxUploadBytes && q > 0.4; q -= 0.12) blob = await encode(blob.type, q);
  if (!blob) throw new Error('photo_upload_failed');
  if (blob.size > PHOTO_RULES.maxUploadBytes) throw new Error('photo_too_large');
  return { blob, width, height };
}

/** XHR (not fetch) so we get real upload progress events. */
export function uploadWithProgress(url: string, form: FormData, onProgress: (pct: number) => void): Promise<{ ok: boolean; status: number; data: any }> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => { let data: unknown = {}; try { data = JSON.parse(x.responseText); } catch { /* non-JSON error page */ } resolve({ ok: x.status >= 200 && x.status < 300, status: x.status, data }); };
    x.onerror = () => resolve({ ok: false, status: 0, data: { code: 'network' } });
    x.send(form);
  });
}
