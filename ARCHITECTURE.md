# Architecture

One Next.js 15 App Router application (a modular monolith) and one Supabase project. The domain logic is plain TypeScript with no framework imports, so it can be unit-tested with `node --test` and reused by the API, the UI and the seed generator.

```
browser ──► middleware.ts (locale redirect, cookies, Supabase session refresh)
          ├─► app/[locale]/**/page.tsx   React Server Components ─┐
          └─► app/api/**/route.ts        route() wrapper ───────────┤
                                                                   ▼
                                       server/handlers.ts  (auth checks, zod validation, use-cases)
                                         │            │
                          server/ai/service.ts      server/repo.ts  (Repo interface)
                          ├ anthropic.ts (fetch)     ├ repo-memory.ts   demo mode
                          └ core/* (rules planner)   └ repo-supabase.ts Supabase (RLS as the user)
                                         │
                                       core/*  pure domain code (no I/O)
```

## Directory layout

```
src/
  core/            Framework-free domain code (imported with explicit .ts extensions)
    types.ts         Shared types, categories, market sections, price units
    seed/            20 destinations, 6 sample partners, 48 sample listings
    catalog.ts       In-memory index over destinations + approved listings
    geo.ts           Haversine distance, nearby destinations, route ordering
    pricing.ts       Cost of a listing for N travellers / nights (single source of price maths)
    parse.ts         Free-text request → days, travellers, budget, interests (EN/RU/KY keywords)
    planner.ts       Deterministic rules planner (also the AI fallback)
    modify.ts        Deterministic edits: cheaper day, budget cap, add/remove day, replace stay, add horse riding
    ai-contract.ts   System prompt, tool schema, catalogue context, skeleton → hydrate
    validate.ts      Zod shape check + grounding check of every id and price
    bookings.ts      Status transition matrix (who may move which status)
    consent.ts       Partner application schema, consent records, POLICY_VERSION
    listing-schema.ts Listing input schema, media rules
    analytics.ts     Event types, summary maths (null when there is no data)
    messages.ts      Localised assistant replies
  server/          Server-only code
    handlers.ts      All use-cases; return { status, body }. Used by API routes and pages
    repo.ts          Repo interface (data access contract)
    repo-memory.ts   In-memory implementation (demo mode, tests)
    repo-supabase.ts Supabase implementation
    context.ts       Builds Ctx { repo, user, sessionId, ai } per request; demo users
    ai/anthropic.ts  Anthropic Messages API client (fetch, forced tool call, timeout)
    ai/service.ts    planWithAi / modifyWithAi orchestration
  lib/             env, rate limit, map provider, API helpers, Supabase clients, route wrapper
  i18n/dict.ts     EN / RU / KY dictionaries (RU/KY fall back to EN per key)
  components/      Client and server UI components; ui/ holds the primitives
  app/             Pages ([locale]/...), API routes (api/...), sitemap, robots
  middleware.ts    Locale + cookies + session refresh
  instrumentation*.ts  Sentry init (no-op without DSN)
supabase/
  migrations/0001_schema.sql   Tables, enums, indexes, triggers
  migrations/0002_security.sql RLS on every table, guards, RPCs
  migrations/0003_storage.sql  `media` bucket and storage policies
  seed.sql                     Generated from src/core/seed (npm run db:seed-sql)
tests/             node --test suites (core, server handlers, dashboards)
e2e/               Playwright specs (demo mode)
```

## Request flow

- **Pages** are async Server Components. They call `getCtx()` and the same handlers the API uses (for example `travelerOverview`, `partnerOverview`, `adminQueues`), then pass plain data to client components.
- **API routes** are thin. `route(fn)` in `src/lib/route.ts`:
  - rejects non-GET requests whose `Origin` does not match the host (CSRF protection);
  - builds `Ctx`, parses JSON, and calls the handler;
  - maps `{ status, body }` to a response;
  - reports exceptions to Sentry and returns a generic 500.
- **Handlers** do authorisation (role and ownership), zod validation and the use-case. They never trust client-sent prices or ids.

### API routes

| Route | Methods | Who |
|---|---|---|
| `/api/ai/plan`, `/api/ai/modify` | POST | anyone, rate-limited per user / IP |
| `/api/trips` | GET, POST | traveller |
| `/api/trips/[id]` | DELETE | owner |
| `/api/inquiries` | POST | signed-in user |
| `/api/bookings/[id]/status` | POST | per transition matrix |
| `/api/bookings/[id]/messages` | POST | booking traveller, its partner, admin |
| `/api/partner/apply` | POST | signed-in user |
| `/api/partner/listings` | GET, POST | partner member |
| `/api/media` | POST | partner member (Supabase mode; 501 in demo) |
| `/api/admin/applications/[id]`, `/api/admin/listings/[id]` | POST | admin |
| `/api/admin/summary` | GET | admin |
| `/api/events` | POST | anyone, rate-limited, allow-listed event types |
| `/api/auth/callback`, `/api/auth/logout` | GET / POST | Supabase magic-link callback, sign out |
| `/api/auth/demo` | POST | demo mode only (404 otherwise) |
| `/api/health` | GET | anyone; mode and AI provider, no secrets |

## AI pipeline (Anthropic)

1. `parseRequest` extracts days, travellers, budget level and interests from the text.
2. `catalogContext` builds a compact list of the relevant destinations and approved listings: ids, category, price and unit. It is sent as a cached system block.
3. `callItineraryTool` calls the Anthropic Messages API with `tool_choice` forced to one tool (`create_itinerary`). The tool's input schema allows **ids and short text only**: per day a destination id, title, free activities, listing ids for restaurants/activities/transport, and an accommodation id. There are no price fields.
4. `hydrate` resolves every id against the catalogue, takes names, coordinates and **prices from the database**, computes costs with `pricing.ts`, and drops unknown ids as errors.
5. `validateItinerary` checks the shape (zod) and grounding: every id exists in the catalogue (which holds only approved listings), prices equal DB prices, coordinates match the destination, and totals add up.
6. If it fails, the validator errors are sent back once and the model retries. If the second attempt fails, or the API errors or times out (45 s), the **rules planner** builds the plan and the UI shows "Planned by the JOLIFY rules engine".
7. **Modify**: deterministic edits run first (exact, and untouched days are kept). Only an instruction they do not understand goes to Claude as an id skeleton plus the instruction, then hydrate and validate again. If the result is rejected, the plan stays unchanged and the user is told.

Without `ANTHROPIC_API_KEY` steps 2–6 are skipped and the rules planner is used directly. The response always includes `provider`, and the UI shows it.

`saveTrip` and `modify` re-validate the itinerary the client sends back, so edited prices or ids are rejected (HTTP 422).

## Data model (Postgres)

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`, `role` (traveler / partner / admin). Created by trigger on sign-up |
| `destinations` | id (slug), jsonb `name` {en,ru,ky}, region, lat/lon, season, tags, activities, details |
| `partners`, `partner_members` | Businesses and which users manage them. `verified`, `is_demo` |
| `partner_applications` | Application payload + status (submitted / approved / rejected) |
| `consents` | One row per consent: user_id, consent_type, status (granted / declined / withdrawn), policy_version, granted_at, application_id |
| `listings` | partner, destination, category, `price_usd`, `price_unit`, status (draft / pending_review / approved / rejected / suspended), `is_demo`, optional lat/lon |
| `media` | Uploaded images (storage path, owner partner, listing) |
| `trips` | Saved itineraries (jsonb) per user |
| `bookings`, `booking_events`, `booking_messages` | Requests, status history, thread |
| `favorites`, `reviews` | Schema and RLS only: **no UI or API yet** |
| `analytics_events` | type, props, user_id, session_id, created_at |

Multilingual text is stored as jsonb `{en, ru, ky}`.

## Security

- **RLS is enabled on every table** (`0002_security.sql`). Partners see only their own rows (`my_partner_ids()`), travellers only their own trips and bookings, and admins everything (`is_admin()`).
- **Guard triggers**: only privileged contexts (admin, service role, migrations) can change `profiles.role`, `partners.verified` / `is_demo`, or move a listing out of `draft` / `pending_review`. Any partner edit sends an approved listing back to `pending_review`, and partners cannot set `is_demo`.
- **Booking status** changes go through the `change_booking_status` RPC, which applies the same transition matrix as `core/bookings.ts` and logs `booking_events`.
- `approve_partner_application` RPC creates the partner and membership atomically.
- **Storage**: public read; writes only under `partners/<partner_id>/...` for members of that partner; 8 MB; jpeg/png/webp/avif.
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are read only in server modules (marked `server-only`). The service client is used only for analytics inserts.
- Same-origin check on all API writes. Demo sign-in only redirects to same-site paths.
- Security headers in `next.config.ts`: nosniff, referrer policy, frame deny, permissions policy.
- Rate limiting: in-memory fixed window. AI endpoints: `AI_RATE_LIMIT_PER_MINUTE` (default 8) per user, or per IP when anonymous. Events: 120/min per session. It is per server instance (see `KNOWN_LIMITATIONS.md`).

## Maps

`components/map-view.tsx` loads MapLibre GL with a dynamic import (no SSR), using the style URL from `lib/map-provider.ts`. It supports clustered markers, numbered route markers with a line, a geolocation button and loading/error states. The provider is switchable by env var; see `SETUP.md#maps`.

## Observability

Sentry (`@sentry/nextjs`) is initialised in `instrumentation.ts` / `instrumentation-client.ts` only when a DSN is set. `next.config.ts` wraps the config with `withSentryConfig` only in that case. API exceptions are captured in `route()`.
