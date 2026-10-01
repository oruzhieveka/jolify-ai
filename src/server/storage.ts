/**
 * Object storage boundary for photos. Two implementations with the same contract:
 *  - SupabaseStorage: bucket "media" (production; Storage RLS checks partners/<partner_id>/...)
 *  - MemoryStorage:   demo mode and tests; files served by /api/media/file/[...path]
 */
export interface StorageAdapter {
  readonly kind: 'supabase' | 'memory';
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  remove(paths: string[]): Promise<void>;
  publicUrl(path: string): string;
}

export class MemoryStorage implements StorageAdapter {
  readonly kind = 'memory' as const;
  files = new Map<string, { bytes: Uint8Array; type: string }>();
  private bytesUsed = 0;
  private maxBytes: number;
  /** Demo safety valve: keep the in-memory store small. */
  constructor(maxBytes = 200 * 1024 * 1024) { this.maxBytes = maxBytes; }
  async put(path: string, bytes: Uint8Array, type: string) {
    if (this.bytesUsed + bytes.length > this.maxBytes) throw new Error('storage_full');
    this.files.set(path, { bytes, type }); this.bytesUsed += bytes.length;
  }
  async remove(paths: string[]) {
    for (const p of paths) { const f = this.files.get(p); if (f) { this.bytesUsed -= f.bytes.length; this.files.delete(p); } }
  }
  get(path: string) { return this.files.get(path) ?? null; }
  publicUrl(path: string) { return '/api/media/file/' + path.split('/').map(encodeURIComponent).join('/'); }
}

type SbStorage = { storage: { from(b: string): { upload(p: string, body: Uint8Array, o: object): Promise<{ error: { message: string } | null }>; remove(p: string[]): Promise<{ error: { message: string } | null }>; getPublicUrl(p: string): { data: { publicUrl: string } } } } };

export class SupabaseStorage implements StorageAdapter {
  readonly kind = 'supabase' as const;
  private sb: SbStorage; private bucket: string;
  constructor(sb: SbStorage, bucket = 'media') { this.sb = sb; this.bucket = bucket; }
  async put(path: string, bytes: Uint8Array, contentType: string) {
    const r = await this.sb.storage.from(this.bucket).upload(path, bytes, { contentType, upsert: false, cacheControl: '31536000' });
    if (r.error) throw new Error('upload_failed');
  }
  async remove(paths: string[]) {
    if (!paths.length) return;
    const r = await this.sb.storage.from(this.bucket).remove(paths);
    if (r.error) throw new Error('remove_failed');
  }
  publicUrl(path: string) { return this.sb.storage.from(this.bucket).getPublicUrl(path).data.publicUrl; }
}
