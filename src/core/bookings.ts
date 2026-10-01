import type { BookingStatus, Role } from './types.ts';

/**
 * Inquiry / booking-request lifecycle. A request is only ever "confirmed" by the partner
 * who owns the listing (or an admin). The platform never auto-confirms.
 */
const TRANSITIONS: Record<BookingStatus, Partial<Record<BookingStatus, Role[]>>> = {
  pending: { confirmed: ['partner', 'admin'], rejected: ['partner', 'admin'], cancelled: ['traveler', 'partner', 'admin'] },
  confirmed: { cancelled: ['traveler', 'partner', 'admin'], completed: ['partner', 'admin'] },
  rejected: {},
  cancelled: {},
  completed: {},
};

export function canTransition(from: BookingStatus, to: BookingStatus, role: Role): boolean {
  return !!TRANSITIONS[from]?.[to]?.includes(role);
}

export function nextStatuses(from: BookingStatus, role: Role): BookingStatus[] {
  return (Object.entries(TRANSITIONS[from] ?? {}) as [BookingStatus, Role[]][]).filter(([, r]) => r.includes(role)).map(([s]) => s);
}

export const isTerminal = (s: BookingStatus) => Object.keys(TRANSITIONS[s]).length === 0;
