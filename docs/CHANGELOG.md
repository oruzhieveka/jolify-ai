# Changelog

## 0.2.0 (unreleased)
- **Directions:** "How to get there" now opens a picker: Google Maps, Yandex Maps, 2GIS (real deep links, lon/lat order handled per provider). Destination and listing pages.
- **Map:** Mapbox dark-v11 style (via MapLibre, raster Static Tiles API) when `NEXT_PUBLIC_MAPBOX_TOKEN` is set; OpenFreeMap *dark* fallback. Secret `sk.*` tokens rejected.
- **i18n:** RU and KY dictionaries now 100% translated (was 39 / 54 English leftovers). Test fails if any key regresses. Added nav-picker strings.
- **Clean production start:** `supabase/seed.sql` = 20 curated destinations only. Sample partners/listings moved to `seed.demo.sql`. Migration 0004 purges any `is_demo` partners, listings and their bookings/messages/reviews/media/favorites.
- **Payments architecture:** `payment_status` enum (pending/paid/failed/refunded/cancelled), `payments` table (service-role writes only, `is_test` flag), `platform_revenue` view counting only real paid payments.
- **Env safety:** demo mode is opt-in only (no silent fallback when Supabase is missing); server start fails with a clear message on missing production vars, demo mode in production, or anon key == service key.
- Tests: 25 → 31 passing.


Format: [Keep a Changelog](keepachangelog.com). Versioning: SemVer.

## [0.1.0] — 2026-10-01 (unreleased; never built or deployed)

First implementation of JOLIFY AI, based on the `visit-kyrgyzstan-ai` HTML prototype (its destination, partner and listing data became `src/core/seed`).

### Added
- Next.js 15 App Router app with EN/RU/KY locale routing, a Tailwind v4 theme and shadcn-style UI primitives.
- Framework-free domain core: request parser, rules planner, modifier, pricing, geo, grounding validator, booking transitions, consent, analytics.
- AI planning with Anthropic tool use (ids only) → hydrate from DB → validate → one retry → rules fallback. The engine is shown in the UI.
- Pages: home, planner, destinations (list and detail), map explorer, marketplace sections, listing detail with booking request, trips, partner landing and application, partner dashboard, admin dashboard, login, draft legal pages, 404/error/loading.
- 19 API routes with a same-origin check, zod validation, role checks and Sentry capture.
- Supabase migrations: schema, RLS on every table, guard triggers, `change_booking_status` and `approve_partner_application` RPCs, `media` storage bucket. Generated `seed.sql`.
- Demo mode (`MemoryRepo`, demo accounts, DEMO banner).
- MapLibre maps with a switchable provider (OpenFreeMap / MapTiler / custom), clustering, route line and geolocation.
- Analytics events and admin/partner metrics computed from stored data.
- Sitemap, robots, JSON-LD on destination pages, security headers.
- 25 unit/integration tests (`npm test`), Playwright E2E suite (`e2e/`, not yet run), ESLint flat config.
- Docs: README, PROJECT, ARCHITECTURE, SETUP, TESTING, ROADMAP, BACKLOG, DECISIONS, KNOWN_LIMITATIONS.

### Verified
- `npm test`: 25/25 pass.
- Strict type check: 0 errors (against stand-in types for Next.js, Supabase, Sentry and MapLibre).
- Offline server-render and API smoke run: 208/208 checks (see `TESTING.md`).

### Not verified
- `next build`, browser behaviour, CSS, Supabase, real Anthropic calls, map tiles, Netlify. See `KNOWN_LIMITATIONS.md`.
