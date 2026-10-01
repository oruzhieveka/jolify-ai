# Known limitations

This is an honest list of what is unverified, demo-only, or missing in v0.1.0.

## Not yet verified

The code was written in an offline environment. The following have **never been run**:

| Item | Risk | How it was checked instead |
|---|---|---|
| `npm install` / `next build` | Type errors against the real Next.js 15, Supabase and Sentry types; build config issues | Strict `tsc` with hand-written stand-in type definitions (0 errors); every page and route bundled with esbuild |
| Tailwind CSS rendering | Layout or styling bugs | Not checked: no styled page has been viewed |
| Browser hydration and client interactivity | Client-side bugs in forms, planner chat, map | Playwright suite written but not run |
| Supabase migrations, RLS, RPCs, Storage | SQL errors, policy mistakes | Not checked: no Postgres available |
| `SupabaseRepo` | Query or mapping bugs | Not checked: only `MemoryRepo` is tested |
| Magic-link sign-in | Callback / cookie issues | Not checked |
| Real Anthropic calls | Prompt quality; rejection rate | Mocked API in tests (valid output, hallucination, provider errors) |
| Map tiles from OpenFreeMap / MapTiler | Style or CORS issues | Not checked: MapLibre was replaced by a stand-in in the offline run |
| Netlify deploy (edge middleware, functions) | Runtime differences | Not checked |
| Sentry | Initialisation | Not checked |

## Demo-only behaviour

- Demo sign-in (three fixed accounts, no password) exists only when demo mode is on. `/api/auth/demo` returns 404 otherwise.
- The demo data store is in server memory: reset on restart, and **per serverless instance** on Netlify.
- Image upload is disabled in demo mode.
- 6 partners and 48 listings are **sample data** (`is_demo`, labelled in the UI). Their prices are illustrative, not real quotes. They are also inserted by `supabase/seed.sql`.

## Functional gaps

- Dashboards, admin, partner application form, login and legal pages are English-only. Destination descriptions are English-only.
- Listings have no own coordinates. They are shown at the destination centre and labelled "approximate", and many markers overlap at high zoom.
- Uploaded images are stored but not displayed in a gallery.
- Partners cannot edit or archive a listing from the UI.
- No email notifications for booking requests or status changes.
- No favourites, reviews or profile editing UI (tables exist).
- No payments; bookings are requests only (by design, D-006).
- Rate limiting is in memory per instance, so it is weak on serverless.
- The route line connects day locations with straight segments; it is not road routing.
- Legal pages are drafts and need legal review.
- No CI workflow.
