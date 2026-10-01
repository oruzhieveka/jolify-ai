/**
 * Partner Portal handlers (business profile, listings CRUD, photos). Framework-agnostic and unit-tested.
 * Every write re-derives ownership from the session user; ids in the URL/body are never trusted.
 * In production Postgres RLS + Storage policies enforce the same rules a second time.
 */
import { z } from 'zod';
import { err, needUser, ok, track, type Ctx, type Res } from './handlers.ts';
import type { StorageAdapter } from './storage.ts';
import { ListingInputSchema } from '../core/listing-schema.ts';
import { PartnerProfileSchema } from '../core/partner-profile.ts';
import { PHOTO_RULES, applyOrder, checkImage, storagePath, withCover, type MediaOwnerType, type MediaRow } from '../core/media.ts';

const newId = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^A-Za-z0-9_-]/g, '');

/** Partner ids the session user may manage. Admins may manage any existing partner. */
export async function managedPartnerIds(c: Ctx): Promise<string[]> {
  if (!c.user) return [];
  if (c.user.role === 'admin') return (await c.repo.partners()).map((p) => p.id);
  return c.repo.partnerIdsForUser(c.user.id);
}
async function canManagePartner(c: Ctx, partnerId: string) { return (await managedPartnerIds(c)).includes(partnerId); }

/** Resolves which partner owns a media owner (listing or partner), or null if the user may not touch it. */
async function ownerPartner(c: Ctx, ownerType: MediaOwnerType, ownerId: string): Promise<string | null> {
  if (ownerType === 'partner') return (await canManagePartner(c, ownerId)) ? ownerId : null;
  if (ownerType === 'listing') {
    const l = await c.repo.listing(ownerId);
    return l && (await canManagePartner(c, l.partnerId)) ? l.partnerId : null;
  }
  return c.user?.role === 'admin' ? 'platform' : null; // destination photos: admin only
}

// ---------------- business profile ----------------
export async function getBusiness(c: Ctx, partnerId: string): Promise<Res> {
  const u = needUser(c); if (u) return u;
  if (!(await canManagePartner(c, partnerId))) return err(403, 'Forbidden');
  const p = await c.repo.getPartner(partnerId);
  return p ? ok({ partner: p }) : err(404, 'Not found');
}

export async function updateBusiness(c: Ctx, partnerId: string, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  if (!(await canManagePartner(c, partnerId))) return err(403, 'Forbidden');
  const p = PartnerProfileSchema.safeParse(body);
  if (!p.success) return err(400, 'Please check the form', p.error.issues);
  if (p.data.destination_id && !(await c.repo.catalog()).dest(p.data.destination_id)) return err(400, 'Unknown destination');
  const saved = await c.repo.updatePartnerProfile(partnerId, p.data);
  if (!saved) return err(404, 'Not found');
  await track(c)('partner_profile_updated', { partner_id: partnerId });
  return ok({ partner: saved });
}

// ---------------- listings ----------------
const ListingPatch = ListingInputSchema.partial();

export async function updateListingH(c: Ctx, id: string, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const l = await c.repo.listing(id);
  if (!l || !(await canManagePartner(c, l.partnerId))) return err(404, 'Not found'); // 404, not 403: don't confirm other partners' ids exist
  const p = ListingPatch.safeParse(body);
  if (!p.success) return err(400, 'Please check the listing', p.error.issues);
  if (p.data.destination_id && !(await c.repo.catalog()).dest(p.data.destination_id)) return err(400, 'Unknown destination');
  const saved = await c.repo.updateListing(l.partnerId, id, p.data);
  return saved ? ok({ listing: saved }) : err(404, 'Not found');
}

export async function submitListingH(c: Ctx, id: string): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const l = await c.repo.listing(id);
  if (!l || !(await canManagePartner(c, l.partnerId))) return err(404, 'Not found');
  const saved = await c.repo.submitListing(l.partnerId, id);
  return saved ? ok({ listing: saved }) : err(409, 'Invalid status');
}

export async function deleteListingH(c: Ctx, storage: StorageAdapter, id: string): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const l = await c.repo.listing(id);
  if (!l || !(await canManagePartner(c, l.partnerId))) return err(404, 'Not found');
  if (l.status === 'approved') return err(409, 'Invalid status', undefined, 'approved_listing_locked');
  const photos = await c.repo.listMedia('listing', id);
  if (!(await c.repo.deleteListing(l.partnerId, id))) return err(409, 'Invalid status');
  await storage.remove(photos.map((m) => m.storage_path)).catch(() => {});
  return ok({ deleted: true });
}

// ---------------- photos ----------------
const OwnerSchema = z.object({ owner_type: z.enum(['listing', 'partner', 'destination']), owner_id: z.string().min(1).max(80) });

export async function listPhotos(c: Ctx, storage: StorageAdapter, q: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const p = OwnerSchema.safeParse(q); if (!p.success) return err(400, 'Invalid request');
  if (!(await ownerPartner(c, p.data.owner_type, p.data.owner_id))) return err(404, 'Not found');
  const rows = withCover(await c.repo.listMedia(p.data.owner_type, p.data.owner_id));
  return ok({ photos: rows.map((m) => ({ ...m, url: storage.publicUrl(m.storage_path) })), rules: PHOTO_RULES });
}

export interface UploadInput { owner_type: string; owner_id: string; bytes: Uint8Array; content_type: string; alt?: string | null; caption?: string | null; author?: string | null; license?: string | null; source_url?: string | null }

export async function uploadPhoto(c: Ctx, storage: StorageAdapter, i: UploadInput): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const o = OwnerSchema.safeParse(i); if (!o.success) return err(400, 'Invalid request');
  const partnerId = await ownerPartner(c, o.data.owner_type, o.data.owner_id);
  if (!partnerId) return err(404, 'Not found');
  const existing = await c.repo.listMedia(o.data.owner_type, o.data.owner_id);
  const chk = checkImage(i.bytes, i.content_type, existing.length);
  if (!chk.ok) return err(chk.error === 'limit' ? 409 : 400, 'Invalid image', undefined, 'photo_' + chk.error);
  const id = newId();
  const path = o.data.owner_type === 'destination'
    ? ['platform', 'destinations', o.data.owner_id, id + '.' + chk.type.split('/')[1].replace('jpeg', 'jpg')].join('/')
    : storagePath(partnerId, o.data.owner_type, o.data.owner_id, id, chk.type);
  try { await storage.put(path, i.bytes, chk.type); } catch { return err(502, 'Upload failed', undefined, 'photo_upload_failed'); }
  const clip = (s: string | null | undefined, n: number) => (s ? s.trim().slice(0, n) || null : null);
  // Curated (destination) photos must carry attribution; partner photos are owned by the partner.
  if (o.data.owner_type === 'destination' && (!i.author || !i.license)) { await storage.remove([path]).catch(() => {}); return err(400, 'Please check the form', undefined, 'photo_attribution_required'); }
  try {
    const row = await c.repo.addMedia({
      id, owner_type: o.data.owner_type, owner_id: o.data.owner_id, storage_path: path, position: existing.length, is_cover: existing.length === 0,
      alt: clip(i.alt, PHOTO_RULES.altMax), caption: clip(i.caption, PHOTO_RULES.captionMax), width: chk.width, height: chk.height, bytes: i.bytes.length, content_type: chk.type,
      author: clip(i.author, 120), license: clip(i.license, 60), source_url: i.source_url && /^https:\/\//.test(i.source_url) ? i.source_url.slice(0, 300) : null, created_by: c.user!.id,
    });
    await track(c)('photo_uploaded', { owner_type: o.data.owner_type });
    return ok({ photo: { ...row, url: storage.publicUrl(path) } }, 201);
  } catch {
    await storage.remove([path]).catch(() => {}); // never leave orphaned files
    return err(500, 'Upload failed', undefined, 'photo_upload_failed');
  }
}

async function ownedPhoto(c: Ctx, id: string): Promise<MediaRow | null> {
  const m = await c.repo.getMedia(id);
  return m && (await ownerPartner(c, m.owner_type, m.owner_id)) ? m : null;
}

export async function updatePhoto(c: Ctx, id: string, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const m = await ownedPhoto(c, id); if (!m) return err(404, 'Not found');
  const p = z.object({ alt: z.string().max(PHOTO_RULES.altMax).nullable().optional(), caption: z.string().max(PHOTO_RULES.captionMax).nullable().optional() }).safeParse(body);
  if (!p.success) return err(400, 'Please check the form', p.error.issues);
  return ok({ photo: await c.repo.updateMedia(id, { alt: p.data.alt?.trim() || (p.data.alt === undefined ? undefined : null), caption: p.data.caption?.trim() || (p.data.caption === undefined ? undefined : null) }) });
}

export async function deletePhoto(c: Ctx, storage: StorageAdapter, id: string): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const m = await ownedPhoto(c, id); if (!m) return err(404, 'Not found');
  await c.repo.deleteMedia(id);
  await storage.remove([m.storage_path]).catch(() => {});
  const rest = await c.repo.listMedia(m.owner_type, m.owner_id);
  const reordered = withCover(rest.map((r, i) => ({ ...r, position: i })));
  await c.repo.saveMediaOrder(reordered);
  return ok({ deleted: true, photos: reordered.map((r) => ({ ...r, url: storage.publicUrl(r.storage_path) })) });
}

export async function reorderPhotos(c: Ctx, storage: StorageAdapter, body: unknown): Promise<Res> {
  const u = needUser(c); if (u) return u;
  const p = OwnerSchema.extend({ ids: z.array(z.string()).max(PHOTO_RULES.maxPerOwner), cover_id: z.string().nullable().optional() }).safeParse(body);
  if (!p.success) return err(400, 'Invalid request');
  if (!(await ownerPartner(c, p.data.owner_type, p.data.owner_id))) return err(404, 'Not found');
  const rows = await c.repo.listMedia(p.data.owner_type, p.data.owner_id);
  const ordered = applyOrder(rows, p.data.ids);
  if (!ordered) return err(400, 'Invalid request', undefined, 'photo_order_mismatch');
  if (p.data.cover_id && !rows.some((r) => r.id === p.data.cover_id)) return err(400, 'Invalid request');
  const saved = await c.repo.saveMediaOrder(withCover(ordered, p.data.cover_id ?? undefined));
  return ok({ photos: saved.map((r) => ({ ...r, url: storage.publicUrl(r.storage_path) })) });
}

// ---------------- portal read model ----------------
export async function portalData(c: Ctx, days = 30) {
  const ids = await managedPartnerIds(c);
  const isAdmin = c.user?.role === 'admin';
  const scoped = isAdmin ? (await c.repo.partnerIdsForUser(c.user!.id)) : ids; // admins see their own memberships in the portal
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [partners, listings, bookings, events] = await Promise.all([
    Promise.all(scoped.map((id) => c.repo.getPartner(id))), c.repo.listingsForPartners(scoped), c.repo.bookingsForPartners(scoped), c.repo.events(since),
  ]);
  const mine = new Set(listings.map((l) => l.id));
  const views = events.filter((e) => e.type === 'listing_viewed' && mine.has(String(e.props?.listing_id ?? '')));
  const recent = bookings.filter((b) => b.created_at >= since);
  const byDay: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) byDay[new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)] = 0;
  for (const v of views) { const d = v.created_at.slice(0, 10); if (d in byDay) byDay[d]++; }
  return {
    partnerIds: scoped,
    partners: partners.filter((p) => !!p),
    listings,
    bookings: bookings.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    stats: {
      days,
      listingViews: views.length,
      inquiries: recent.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: recent.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
      viewsByListing: Object.fromEntries(listings.map((l) => [l.id, views.filter((v) => v.props?.listing_id === l.id).length])),
      inquiriesByListing: Object.fromEntries(listings.map((l) => [l.id, recent.filter((b) => b.listing_id === l.id).length])),
      viewsByDay: byDay,
    },
  };
}
export type PortalData = Awaited<ReturnType<typeof portalData>>;
