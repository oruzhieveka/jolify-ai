/** Analytics event names. Anything else is rejected by /api/events. */
export const EVENT_TYPES = [
  'page_view', 'ai_plan_requested', 'ai_plan_succeeded', 'ai_plan_failed', 'ai_plan_fallback', 'ai_modify_requested',
  'ai_modify_applied', 'ai_validation_rejected', 'trip_saved', 'destination_viewed', 'listing_viewed', 'map_opened',
  'map_marker_clicked', 'open_in_maps_clicked', 'inquiry_created', 'booking_status_changed', 'partner_application_submitted',
  'partner_listing_created', 'favorite_added', 'signup', 'login',
  'ai_chat_requested', 'ai_chat_succeeded', 'ai_chat_failed', 'photo_uploaded', 'partner_profile_updated', 'admin_role_changed', 'admin_content_updated',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventRow { type: string; created_at: string; user_id?: string | null; session_id?: string | null; props?: Record<string, unknown> | null }
export interface BookingRow { status: string; created_at: string; total_usd?: number | null }

/** label/hint are keys of Dict['admin']['metrics'], translated in the UI. */
export interface Metric { label: string; value: number | null; hint?: string }

const within = (iso: string, days: number, now: number) => now - Date.parse(iso) <= days * 86400000;

/**
 * Pure aggregation over real rows. Returns null values (rendered as "no data yet")
 * rather than zero-filled or fabricated numbers when nothing has been recorded.
 */
export function summarize(events: EventRow[], bookings: BookingRow[], days = 30, now = Date.now()) {
  const ev = events.filter((e) => within(e.created_at, days, now));
  const count = (t: string) => ev.filter((e) => e.type === t).length;
  const sessions = new Set(ev.map((e) => e.session_id).filter(Boolean)).size;
  const plans = count('ai_plan_requested');
  const ok = count('ai_plan_succeeded');
  const bk = bookings.filter((b) => within(b.created_at, days, now));
  const byStatus: Record<string, number> = {};
  for (const b of bk) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
  const confirmedValue = bk.filter((b) => b.status === 'confirmed' || b.status === 'completed').reduce((a, b) => a + (b.total_usd ?? 0), 0);
  const nz = (n: number) => (ev.length || bk.length ? n : null);
  return {
    hasData: ev.length > 0 || bk.length > 0,
    traffic: [
      { label: 'pageViews', value: nz(count('page_view')) },
      { label: 'sessions', value: nz(sessions) },
      { label: 'destinationViews', value: nz(count('destination_viewed')) },
      { label: 'mapOpens', value: nz(count('map_opened')) },
    ] as Metric[],
    ai: [
      { label: 'plansRequested', value: nz(plans) },
      { label: 'planSuccess', value: plans ? Math.round((ok / plans) * 100) : null },
      { label: 'fallbacks', value: nz(count('ai_plan_fallback')) },
      { label: 'rejected', value: nz(count('ai_validation_rejected')) },
      { label: 'modifications', value: nz(count('ai_modify_applied')) },
      { label: 'tripsSaved', value: nz(count('trip_saved')) },
    ] as Metric[],
    marketplace: [
      { label: 'listingViews', value: nz(count('listing_viewed')) },
      { label: 'inquiries', value: nz(bk.length) },
      { label: 'applications', value: nz(count('partner_application_submitted')) },
    ] as Metric[],
    bookingsByStatus: byStatus,
    financial: [
      { label: 'confirmedValue', value: bk.length ? Math.round(confirmedValue) : null, hint: 'confirmedValueHint' },
    ] as Metric[],
    daily: dailySeries(ev, days, now),
  };
}

export function dailySeries(ev: EventRow[], days: number, now: number) {
  const out: { date: string; views: number; plans: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
    const same = ev.filter((e) => e.created_at.slice(0, 10) === d);
    out.push({ date: d, views: same.filter((e) => e.type === 'page_view').length, plans: same.filter((e) => e.type === 'ai_plan_requested').length });
  }
  return out;
}
