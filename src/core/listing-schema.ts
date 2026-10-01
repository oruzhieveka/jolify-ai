import { z } from 'zod';
import { LISTING_CATEGORIES, PRICE_UNITS } from './types.ts';

/** What a partner may submit for a listing. Status is never client-controlled. */
export const ListingInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  category: z.enum(LISTING_CATEGORIES),
  destination_id: z.string().min(2),
  price_usd: z.number().positive().max(100000),
  price_unit: z.enum(PRICE_UNITS),
  description: z.string().trim().min(20).max(4000),
  tags: z.array(z.string().trim().min(2).max(24)).max(10).default([]),
  address: z.string().trim().max(200).optional(),
  lat: z.number().min(39).max(43.5).optional(),
  lon: z.number().min(69).max(80.5).optional(),
  availability_note: z.string().max(300).optional(),
});
export type ListingInput = z.infer<typeof ListingInputSchema>;

export const MEDIA_RULES = {
  maxBytes: 8 * 1024 * 1024,
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  maxPerOwner: 20,
} as const;

export function checkUpload(file: { size: number; type: string }, existingCount: number): string | null {
  if (!MEDIA_RULES.types.includes(file.type as (typeof MEDIA_RULES.types)[number])) return 'Only JPEG, PNG, WebP or AVIF images are allowed';
  if (file.size > MEDIA_RULES.maxBytes) return 'Image is larger than 8 MB';
  if (existingCount >= MEDIA_RULES.maxPerOwner) return 'Maximum of 20 images per listing';
  return null;
}
