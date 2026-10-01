# JOLIFY AI — Project

## What it is

JOLIFY AI is a travel planner and lead-generation marketplace for Kyrgyzstan. It combines:

1. **AI trip planner**: a free-text request becomes a day-by-day itinerary using only destinations and approved listings from the database. Prices come from the database.
2. **Destination guide and map**: 20 destinations with facts, practical details, nearby places and a MapLibre map.
3. **Marketplace**: approved listings from local businesses (stays, food, tours, guides, transport, experiences). Travellers send **booking requests**, which partners confirm or decline. There are no payments.
4. **Partner area**: application with recorded consent, a dashboard with real request and view counts, and listing creation that goes through moderation.
5. **Admin area**: partner and listing moderation queues, plus metrics computed from recorded events.

This document covers the current code (v0.1.0). For what is not built or not verified, see `BACKLOG.md` and `KNOWN_LIMITATIONS.md`.

## Roles

| Role | Can |
|---|---|
| Anonymous | Browse, plan trips (not save), view the map and listings |
| Traveller | Everything above, plus save/delete trips, send booking requests, message on own requests, cancel own requests, apply as a partner |
| Partner | Manage the businesses they belong to: answer requests (confirm / decline / complete / cancel), message, create listings (go to moderation), upload images (Supabase mode only), see own stats |
| Admin | Approve or reject partner applications and listings, view metrics, act on any booking |

In demo mode the three signed-in roles are picked on `/[locale]/login`. In Supabase mode users sign in with an email magic link. New users are `traveler`, an approved partner application adds the user to `partner_members`, and admins are promoted with SQL (see `SETUP.md`).

## Feature inventory (implemented)

### Traveller
- Home page with a trip prompt and example prompts.
- `/plan`: chat-style planner. The first message creates a plan, and later messages modify it ("make day 2 cheaper", "add a day in Karakol", "swap the hotel"). The page shows each day's places, activities, listings, an estimated total (from DB prices), a route map and which engine produced it ("Planned by Claude, checked against the catalogue" or "Planned by the JOLIFY rules engine").
- Save the trip (signed in), reopen it (`/plan?trip=<id>`), delete it (`/trips`).
- `/destinations` with a region filter. `/destinations/[slug]` has facts, practical details, listings at the destination, a map, nearby destinations, JSON-LD and "open in maps" / "directions" links.
- `/map`: all destinations and listings, with type chips, region filter, search, list-to-map sync and clustering. Listings without their own coordinates are drawn at the destination centre and labelled *approximate*.
- `/marketplace/[section]` (stay, eat, tours, guides, transport, experiences) with destination, max-price and sort filters.
- `/listings/[id]` (approved listings only) with a booking-request form (dates, guests, message).
- `/trips`: saved trips and the user's booking requests with status and message thread.

### Partner
- `/partner`: landing page and application form. Three required consents (partner terms, data processing, listing accuracy) and one optional consent (marketing) are shown as unticked checkboxes. The submit button stays disabled until the required ones are ticked.
- `/partner/dashboard`: views, requests and confirmation counts for the last 30 days, computed from stored events and bookings (shown as "—" when there is no data). It also has the request inbox with actions and messages, a listings table with status and views, a new-listing form and image upload.

### Admin
- `/admin`: metric groups (traffic, AI, marketplace, partners), a daily bar chart, the partner-application queue (showing recorded consents and policy version) and the listing moderation queue.

### Platform
- Locale routing with `/` redirecting by cookie, then `Accept-Language`. A language switch keeps the current path.
- `sitemap.xml` and `robots.txt`; per-page metadata.
- Analytics events (`page_view`, AI, map, listing, booking and partner events) are stored in `analytics_events` with an anonymous session cookie.
- Draft legal pages (`/legal/terms`, `/legal/privacy`, `/legal/partner-terms`), clearly marked as drafts that need legal review.
- Health endpoint `/api/health` reports mode (`demo` / `supabase`) and AI provider (`anthropic` / `rules-only`) without secrets.

## Product rules (enforced in code)

| Rule | Where |
|---|---|
| AI never invents businesses, prices or availability | `src/core/ai-contract.ts` (ID-only skeleton + `hydrate`), `src/core/validate.ts` (grounding validator) |
| Prices are always database prices | `hydrate()` overwrites every price; `saveTrip` re-validates and rejects tampered prices (HTTP 422) |
| Bookings never auto-confirm | `src/core/bookings.ts` transition matrix; `change_booking_status` RPC in `0002_security.sql` |
| Consent stored with status, timestamp, policy version, user ID | `src/core/consent.ts`, `consents` table |
| Demo content is labelled | `DEMO` banner in demo mode, "Sample listing" badge and notice for `is_demo` listings, "(sample)" for demo partners |
| No fake numbers | Dashboards compute from stored rows; empty states say "No data recorded yet" |

## Booking statuses

`pending` → `confirmed` | `rejected` | `cancelled`; `confirmed` → `cancelled` | `completed`. `rejected`, `cancelled` and `completed` are final.

| Transition | Allowed for |
|---|---|
| pending → confirmed / rejected | partner of the listing, admin |
| pending → cancelled | traveller, partner, admin |
| confirmed → cancelled | traveller, partner, admin |
| confirmed → completed | partner, admin |

Every change is logged in `booking_events`.

## Seed content

`src/core/seed` (mirrored into `supabase/seed.sql`) contains 20 real destinations with descriptions in EN (names in EN/RU/KY), 6 **sample** partners and 48 **sample** listings, all flagged `is_demo`. The sample prices are illustrative, not quotes from real businesses. Remove or replace them before launch (see `BACKLOG.md`).
