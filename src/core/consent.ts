import { z } from 'zod';
import { PARTNER_CATEGORIES } from './types.ts';

/** Bump when the partner terms change; stored with every consent record. */
export const PARTNER_POLICY_VERSION = '2026-10-01';

export const REQUIRED_PARTNER_CONSENTS = ['partner_terms', 'data_processing', 'listing_accuracy'] as const;
export const OPTIONAL_PARTNER_CONSENTS = ['marketing'] as const;
export type ConsentType = (typeof REQUIRED_PARTNER_CONSENTS)[number] | (typeof OPTIONAL_PARTNER_CONSENTS)[number];

export const PartnerApplicationSchema = z.object({
  business_name: z.string().trim().min(2).max(120),
  category: z.enum(PARTNER_CATEGORIES),
  city: z.string().trim().min(2).max(80),
  contact_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'invalid phone'),
  email: z.string().trim().email(),
  website: z.string().trim().url().optional().or(z.literal('')),
  description: z.string().trim().min(20).max(2000),
  consents: z.object({
    partner_terms: z.literal(true, { message: 'You must accept the partner terms' }),
    data_processing: z.literal(true, { message: 'You must accept data processing' }),
    listing_accuracy: z.literal(true, { message: 'You must confirm listing accuracy' }),
    marketing: z.boolean().default(false),
  }),
  policy_version: z.literal(PARTNER_POLICY_VERSION, { message: 'Policy version changed, please reload' }),
});
export type PartnerApplicationInput = z.infer<typeof PartnerApplicationSchema>;

export interface ConsentRecord {
  user_id: string;
  consent_type: ConsentType;
  status: 'granted' | 'declined' | 'withdrawn';
  policy_version: string;
  granted_at: string;
}

export function consentRecords(userId: string, input: PartnerApplicationInput, now = new Date()): ConsentRecord[] {
  const ts = now.toISOString();
  return (Object.entries(input.consents) as [ConsentType, boolean][]).map(([k, v]) => ({
    user_id: userId, consent_type: k, status: v ? 'granted' : 'declined', policy_version: input.policy_version, granted_at: ts,
  }));
}
