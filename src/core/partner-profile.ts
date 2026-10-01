import { z } from 'zod';
import { PARTNER_CATEGORIES } from './types.ts';

const url = z.string().trim().max(300).refine((s) => s === '' || /^https:\/\/[^\s<>"']+$/i.test(s), 'https_only');
const handle = z.string().trim().max(120).refine((s) => s === '' || /^(@?[A-Za-z0-9_.]{2,60}|https:\/\/[^\s<>"']+)$/.test(s), 'bad_handle');
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const day = z.object({ closed: z.boolean(), open: hhmm, close: hhmm }).nullable();
export const OpeningHoursSchema = z.object({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day });
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;
export const WEEK_DAYS = DAYS;

/** Everything a partner may edit about their own business. Verification and demo flags are admin-only. */
export const PartnerProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.enum(PARTNER_CATEGORIES),
  description: z.string().trim().max(4000).default(''),
  destination_id: z.string().max(60).nullable().default(null),
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).default(''),
  phone: z.string().trim().max(40).refine((s) => s === '' || /^\+?[0-9 ()-]{7,20}$/.test(s), 'bad_phone').default(''),
  email: z.string().trim().max(160).refine((s) => s === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'bad_email').default(''),
  website: url.default(''),
  social: z.object({ instagram: handle.default(''), facebook: handle.default(''), telegram: handle.default(''), whatsapp: handle.default('') }).default({ instagram: '', facebook: '', telegram: '', whatsapp: '' }),
  opening_hours: OpeningHoursSchema.nullable().default(null),
  services: z.array(z.string().trim().min(2).max(60)).max(30).default([]),
  amenities: z.array(z.string().trim().min(2).max(60)).max(30).default([]),
  price_note: z.string().trim().max(300).default(''),
}).superRefine((v, ctx) => {
  for (const d of DAYS) {
    const h = v.opening_hours?.[d];
    if (h && !h.closed && h.open >= h.close) ctx.addIssue({ code: 'custom', path: ['opening_hours', d], message: 'close_before_open' });
  }
});
export type PartnerProfileInput = z.infer<typeof PartnerProfileSchema>;
