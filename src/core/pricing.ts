import type { Listing, PriceUnit } from './types.ts';

/**
 * Group cost for one unit of a listing. The ONLY place prices are computed.
 * room-night: 2 guests per room; vehicle/car: 4 guests per vehicle; guide-day: flat.
 */
export function costOf(l: Pick<Listing, 'priceUsd' | 'unit'>, travelers: number): number {
  const t = Math.max(1, Math.floor(travelers || 1));
  switch (l.unit) {
    case 'room-night': return l.priceUsd * Math.ceil(t / 2);
    case 'vehicle-day': case 'car-day': case 'vehicle-trip': return l.priceUsd * Math.ceil(t / 4);
    case 'guide-day': return l.priceUsd;
    default: return l.priceUsd * t;
  }
}

export const UNIT_LABEL: Record<PriceUnit, string> = {
  'room-night': 'per room / night', person: 'per person', 'person-meal': 'per person / meal',
  'person-day': 'per person / day', 'person-night': 'per person / night', 'vehicle-day': 'per vehicle / day',
  'vehicle-trip': 'per vehicle / trip', 'car-day': 'per car / day', 'guide-day': 'per guide / day',
};

export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
