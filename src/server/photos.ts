import 'server-only';
import { withCover, type MediaOwnerType } from '@/core/media';
import type { GalleryPhoto } from '@/components/photo-gallery';
import { getStorage } from './context';
import type { Repo } from './repo';

/** Photos for public pages: cover first, then by position, with resolved public URLs. */
export async function galleryFor(repo: Repo, ownerType: MediaOwnerType, ownerId: string): Promise<GalleryPhoto[]> {
  const [rows, storage] = await Promise.all([repo.listMedia(ownerType, ownerId).catch(() => []), getStorage()]);
  const sorted = withCover(rows).sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
  return sorted.map((m) => ({ id: m.id, url: storage.publicUrl(m.storage_path), alt: m.alt, caption: m.caption, width: m.width, height: m.height, author: m.author, license: m.license, source_url: m.source_url }));
}

/** Cover URL per owner id, for cards. */
export async function coverUrls(repo: Repo, ownerType: MediaOwnerType, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const [rows, storage] = await Promise.all([repo.coverPhotos(ownerType, ids).catch(() => []), getStorage()]);
  return Object.fromEntries(rows.map((m) => [m.owner_id, storage.publicUrl(m.storage_path)]));
}
