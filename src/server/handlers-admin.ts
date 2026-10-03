/** Admin Portal handlers. Every function re-checks role === 'admin' server-side. */
import { z } from 'zod';
import { err, ok, track, type Ctx, type Res } from './handlers.ts';
import { LANGS, ROLES } from '../core/types.ts';

const needAdmin = (c: Ctx): Res | null => (!c.user ? err(401, 'Sign in required') : c.user.role !== 'admin' ? err(403, 'Forbidden') : null);

export async function adminSetRole(c: Ctx, userId: string, body: unknown): Promise<Res> {
  const a = needAdmin(c); if (a) return a;
  const p = z.object({ role: z.enum(ROLES) }).safeParse(body); if (!p.success) return err(400, 'Invalid request');
  if (userId === c.user!.id && p.data.role !== 'admin') return err(409, 'Invalid request', undefined, 'cannot_demote_self');
  const r = await c.repo.setUserRole(userId, p.data.role);
  if (!r) return err(404, 'Not found');
  await track(c)('admin_role_changed', { user_id: userId, role: p.data.role });
  return ok({ user: r });
}

export async function adminPartnerFlags(c: Ctx, id: string, body: unknown): Promise<Res> {
  const a = needAdmin(c); if (a) return a;
  const p = z.object({ verified: z.boolean().optional(), status: z.enum(['active', 'suspended']).optional() }).refine((v) => v.verified !== undefined || v.status !== undefined).safeParse(body);
  if (!p.success) return err(400, 'Invalid request');
  const r = await c.repo.setPartnerFlags(id, p.data);
  if (!r) return err(404, 'Not found');
  // Suspending a partner takes all their live listings off the public site.
  if (p.data.status === 'suspended') for (const l of await c.repo.listingsForPartners([id])) if (l.status === 'approved') await c.repo.setListingStatus(l.id, 'suspended', c.user!.id);
  return ok({ partner: r });
}

const loc = z.object({ en: z.string().trim().min(1).max(4000), ru: z.string().trim().max(4000).optional(), ky: z.string().trim().max(4000).optional() });
const langBlock = z.object({
  activities: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  tips: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  dayTitle: z.string().trim().max(120).optional(),
  details: z.object({ howToGetThere: z.string().max(2000).optional(), history: z.string().max(4000).optional(), culture: z.string().max(4000).optional(), safety: z.string().max(2000).optional() }).optional(),
}).optional();
const cleanLoc = (o?: { en: string; ru?: string; ky?: string }) => o && Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as { en: string; ru?: string; ky?: string };
const detailsSchema = z.object({
  history: z.string().trim().max(4000).optional(),
  culture: z.string().trim().max(4000).optional(),
  howToGetThere: z.string().trim().max(2000).optional(),
  safety: z.string().trim().max(2000).optional(),
  altitudeM: z.number().int().min(0).max(9000).optional(),
  nearby: z.array(z.string().trim().regex(/^[a-z0-9-]+$/)).max(12).optional(),
});
const destinationCreateSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9-]+$/).min(2).max(80),
  name: loc,
  region: z.string().trim().min(1).max(80),
  lat: z.number().min(39).max(43.5),
  lon: z.number().min(69).max(80.5),
  season: z.string().trim().max(40).default(''),
  duration: z.string().trim().max(40).default(''),
  difficulty: z.string().trim().max(40).nullable().default(null),
  budgetPerDayUsd: z.number().min(0).max(10000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  activities: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  description: loc,
  tips: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  order: z.number().min(-1000).max(1000),
  popularity: z.number().int().min(0).max(100).default(0),
  zone: z.enum(['hub', 'north', 'south', 'remote', 'west']),
  dayTitle: z.string().trim().min(1).max(160),
  details: detailsSchema.default({}),
  published: z.boolean().default(true),
});
const destinationPatchSchema = destinationCreateSchema.omit({ id: true }).partial().extend({ i18n: z.object({ ru: langBlock, ky: langBlock }).optional() });

export async function adminCreateDestination(c: Ctx, body: unknown): Promise<Res> {
  const a = needAdmin(c); if (a) return a;
  const p = destinationCreateSchema.safeParse(body); if (!p.success) return err(400, 'Please check the form', p.error.issues);
  if ((await c.repo.allDestinations()).some((d) => d.id === p.data.id)) return err(409, 'Invalid request', undefined, 'invalid_request');
  const input = { ...p.data, name: cleanLoc(p.data.name)!, description: cleanLoc(p.data.description)! };
  const d = await c.repo.createDestination(input);
  await track(c)('admin_destination_created', { destination_id: d.id });
  return ok({ destination: d }, 201);
}

export async function adminUpdateDestination(c: Ctx, id: string, body: unknown): Promise<Res> {
  const a = needAdmin(c); if (a) return a;
  const p = destinationPatchSchema.safeParse(body); if (!p.success) return err(400, 'Please check the form', p.error.issues);
  const d = await c.repo.updateDestination(id, { ...p.data, name: cleanLoc(p.data.name), description: cleanLoc(p.data.description) });
  if (!d) return err(404, 'Not found');
  await track(c)('admin_content_updated', { destination_id: id });
  return ok({ destination: d });
}

export async function adminUpdateSettings(c: Ctx, body: unknown): Promise<Res> {
  const a = needAdmin(c); if (a) return a;
  const p = z.object({
    maintenance_banner: z.object(Object.fromEntries(LANGS.map((l) => [l, z.string().max(300).optional()])) as { en: z.ZodOptional<z.ZodString>; ru: z.ZodOptional<z.ZodString>; ky: z.ZodOptional<z.ZodString> }).nullable().optional(),
    inquiries_enabled: z.boolean().optional(), ai_enabled: z.boolean().optional(), partner_applications_open: z.boolean().optional(),
  }).safeParse(body);
  if (!p.success) return err(400, 'Invalid request');
  const banner = p.data.maintenance_banner;
  const patch = { ...p.data, maintenance_banner: banner === undefined ? undefined : banner && banner.en ? { en: banner.en, ru: banner.ru || undefined, ky: banner.ky || undefined } : null };
  return ok({ settings: await c.repo.updateSettings(Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))) });
}

/** Real numbers only. Revenue counts paid, non-test payments; everything else is a plain count of rows. */
export async function adminOverview(c: Ctx, days = 30): Promise<Res> {
  const a = needAdmin(c); if (a) return a;
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [users, partners, listings, bookings, payments, events, apps] = await Promise.all([
    c.repo.listProfiles(), c.repo.listPartnerProfiles(), c.repo.allListings(), c.repo.allBookings(), c.repo.payments(), c.repo.events(since), c.repo.listApplications('submitted'),
  ]);
  const realPaid = payments.filter((p) => p.status === 'paid' && !p.is_test);
  return ok({
    dataSource: c.repo.kind,
    counts: {
      users: users.length,
      partners: partners.filter((p) => !p.isDemo).length,
      samplePartners: partners.filter((p) => p.isDemo).length,
      listingsLive: listings.filter((l) => l.status === 'approved' && !l.isDemo).length,
      sampleListings: listings.filter((l) => l.isDemo).length,
      listingsPending: listings.filter((l) => l.status === 'pending_review').length,
      applicationsPending: apps.length,
      inquiries: bookings.length,
      bookingsConfirmed: bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length,
      paymentsPaid: realPaid.length,
      revenueUsd: Math.round(realPaid.reduce((s, p) => s + p.amount_usd, 0) * 100) / 100,
      testPayments: payments.filter((p) => p.is_test).length,
      events: events.length,
      plans: events.filter((e) => e.type === 'ai_plan_succeeded').length,
    },
  });
}
