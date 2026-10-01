/**
 * Photo management rules shared by the browser, the API and the tests.
 * Framework-free so it runs under plain Node.
 */
export const MEDIA_OWNER_TYPES = ['listing', 'partner', 'destination'] as const;
export type MediaOwnerType = (typeof MEDIA_OWNER_TYPES)[number];

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export const PHOTO_RULES = {
  /** Largest original a user may pick. The browser re-encodes it before upload. */
  maxOriginalBytes: 20 * 1024 * 1024,
  /** Largest body the server accepts (fits serverless request limits on Vercel/Netlify). */
  maxUploadBytes: 4 * 1024 * 1024,
  /** Long edge after client-side optimisation. */
  maxEdgePx: 2400,
  minEdgePx: 600,
  maxPerOwner: 20,
  altMax: 160,
  captionMax: 300,
} as const;

export interface MediaRow {
  id: string;
  owner_type: MediaOwnerType;
  owner_id: string;
  storage_path: string;
  position: number;
  is_cover: boolean;
  alt: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  content_type: string | null;
  /** Attribution for curated (non-partner) photos. Required when license is set. */
  author: string | null;
  license: string | null;
  source_url: string | null;
  created_by: string | null;
  created_at: string;
}

export type UploadError = 'type' | 'too_large' | 'too_small' | 'limit' | 'mismatch' | 'empty';

/** Detects the real image type from magic bytes. Never trust the declared Content-Type alone. */
export function sniffImageType(b: Uint8Array): ImageType | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (ascii(4, 4) === 'ftyp' && /^(avif|avis)$/.test(ascii(8, 4))) return 'image/avif';
  return null;
}

/** Reads width/height from PNG, JPEG and WebP headers (no decoding). Returns null when unknown. */
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  const t = sniffImageType(b);
  const u16 = (o: number) => (b[o] << 8) | b[o + 1];
  const u32 = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const le16 = (o: number) => b[o] | (b[o + 1] << 8);
  const le24 = (o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
  if (t === 'image/png' && b.length >= 24) return { width: u32(16), height: u32(20) };
  if (t === 'image/jpeg') {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      const m = b[o + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: u16(o + 5), width: u16(o + 7) };
      o += 2 + u16(o + 2);
    }
    return null;
  }
  if (t === 'image/webp' && b.length >= 30) {
    const chunk = String.fromCharCode(...b.slice(12, 16));
    if (chunk === 'VP8X') return { width: le24(24) + 1, height: le24(27) + 1 };
    if (chunk === 'VP8 ') return { width: le16(26) & 0x3fff, height: le16(28) & 0x3fff };
    if (chunk === 'VP8L') { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 }; }
  }
  return null;
}

/** Server-side upload check. `declared` is the client Content-Type; the bytes must agree with it. */
export function checkImage(bytes: Uint8Array, declared: string, existingCount: number): { ok: true; type: ImageType; width: number | null; height: number | null } | { ok: false; error: UploadError } {
  if (!bytes.length) return { ok: false, error: 'empty' };
  if (existingCount >= PHOTO_RULES.maxPerOwner) return { ok: false, error: 'limit' };
  if (bytes.length > PHOTO_RULES.maxUploadBytes) return { ok: false, error: 'too_large' };
  const real = sniffImageType(bytes);
  if (!real) return { ok: false, error: 'type' };
  if (declared && declared !== real) return { ok: false, error: 'mismatch' };
  const size = imageSize(bytes);
  if (size && Math.max(size.width, size.height) < PHOTO_RULES.minEdgePx) return { ok: false, error: 'too_small' };
  return { ok: true, type: real, width: size?.width ?? null, height: size?.height ?? null };
}

export const EXT: Record<ImageType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

/** Storage layout. First folder after "partners" is the partner id, which the Storage RLS policy checks. */
export function storagePath(partnerId: string, ownerType: MediaOwnerType, ownerId: string, id: string, type: ImageType): string {
  const safe = (s: string) => { if (!/^[A-Za-z0-9_-]{1,80}$/.test(s)) throw new Error('unsafe path segment'); return s; };
  return ['partners', safe(partnerId), ownerType, safe(ownerId), safe(id) + '.' + EXT[type]].join('/');
}

/** Applies a new order. The id list must be a permutation of the current ids. */
export function applyOrder(rows: MediaRow[], ids: string[]): MediaRow[] | null {
  if (ids.length !== rows.length || new Set(ids).size !== ids.length) return null;
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (!ids.every((id) => byId.has(id))) return null;
  return ids.map((id, i) => ({ ...byId.get(id)!, position: i }));
}

/** Exactly one cover per owner. Falls back to the first photo if none is flagged. */
export function withCover(rows: MediaRow[], coverId?: string | null): MediaRow[] {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const target = coverId ?? sorted.find((r) => r.is_cover)?.id ?? sorted[0]?.id ?? null;
  return sorted.map((r) => ({ ...r, is_cover: r.id === target }));
}

export const coverOf = (rows: MediaRow[]): MediaRow | null => withCover(rows).find((r) => r.is_cover) ?? null;
