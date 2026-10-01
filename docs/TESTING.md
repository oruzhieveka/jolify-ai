# Testing

## 1. Unit and integration tests: `npm test`

`node --test --experimental-strip-types tests/*.test.ts` needs no extra packages and no network. The Anthropic API is replaced by a mocked `fetch`, and data uses `MemoryRepo`.

| File | Covers |
|---|---|
| `tests/core.test.ts` | Seed integrity (coordinates inside Kyrgyzstan), price maths, EN/RU/KY parser, the planner on six prompts (output must pass the validator), budget fitting, the **planted fake price** tamper test, rejection of invented / unapproved listings, every modifier intent in EN/RU/KY, no input mutation |
| `tests/server.test.ts` | LLM path: valid tool output hydrated with DB prices; hallucinated listing → retry → rules fallback; provider error → fallback; tampered itinerary refused; trips auth + validation + ownership; partner consent stored with version and timestamp; listing needs approval; bookings stay pending until the partner confirms, with role-checked transitions; analytics report "no data" on an empty platform |
| `tests/dashboards.test.ts` | Traveller, partner and admin read models; approved application creates a verified partner the applicant can manage |

Last result: **25 / 25 passing** (Node 24).

## 2. Type check: `npm run typecheck`

Strict TypeScript over `src`, `tests`, `scripts`, `e2e` and `playwright.config.ts`.

## 3. End-to-end tests: `npm run test:e2e`

Playwright, in `e2e/`, configured by `playwright.config.ts`.

- By default it runs `npm run build && next start -p 3100` in **demo mode** (`DEMO_MODE=true`, Supabase and Anthropic env vars blanked). No credentials are needed and no external services are touched, except map tiles in the map test.
- `E2E_BASE_URL=<url> npm run test:e2e` runs the suite against an already running or deployed instance in demo mode, without starting a server.
- One worker, not parallel: the flows share the in-memory demo store.
- Projects: `chromium` (all specs) and `mobile` (Pixel 7, smoke spec only).

First run: `npx playwright install chromium`.

| Spec | Flow |
|---|---|
| `smoke.spec.ts` | `/` redirects to a locale; 10 key pages return 200 with a heading, the demo banner and no uncaught browser errors; unknown destination is 404; `/api/health` reports demo mode |
| `planner.spec.ts` | Traveller: plan from a prompt → "make day 2 cheaper" → save → trip appears on `/trips`; anonymous users are asked to sign in to save; cross-origin AI POST is rejected (403) |
| `booking.spec.ts` | Traveller sends a booking request → status *Pending* and no Confirm button for the traveller → partner confirms in the dashboard → traveller sees *Confirmed* |
| `partner-admin.spec.ts` | Partner application: submit disabled until the three required consents are ticked → admin sees it with the policy version → approves. A new partner listing returns 404 publicly until an admin approves it, then 200. A traveller gets 403 from the admin API |
| `i18n-map.spec.ts` | Language switch keeps the path and sets `<html lang>`; the choice is remembered on `/`; the map page shows a MapLibre canvas or a visible error state |

`e2e/helpers.ts` signs in through the demo login buttons (`data-testid="demo-<role>"`).

### Status of the E2E suite

The suite was written in an **offline sandbox**: no npm registry, no browser binaries and no Next.js. `playwright test --list` parses all 5 spec files (35 tests across the two projects) and the specs type-check, but **they have never been run against the real app**. Expect to adjust a few selectors or timings on the first real run.

The same flows *were* checked at the HTTP level by a temporary offline harness (not part of the repo). It bundled every page, layout and API route with esbuild, using stand-ins for `next/*`, Supabase and Sentry, then server-rendered each page with `react-dom/server` and drove the API routes and middleware directly. Last run: **208 / 208 checks passed**:
- every page in EN/RU/KY for anonymous, traveller, partner and admin;
- 404s; plan → modify → save; tampered price rejected;
- booking request → traveller cannot confirm → partner confirms → traveller sees confirmed;
- partner apply → admin approve; listing moderation;
- events, health, demo auth and open-redirect protection, sitemap and robots.

That harness did **not** hydrate client components in a browser or load CSS. Client-side behaviour is only covered by the Playwright suite above.

## 4. Checks to do once a Supabase project exists

These have not been done. Run them before launch:

1. Apply migrations and seed on a fresh project with no errors.
2. Sign in as a new user → a `profiles` row with `role = 'traveler'` appears.
3. RLS, using two non-admin accounts A and B:
   - A cannot read B's trips or bookings;
   - A cannot update its own `profiles.role`;
   - a partner cannot set its own listing to `approved` (it stays `pending_review`);
   - a partner cannot read another partner's bookings;
   - anonymous users see only `approved` listings.
4. A traveller calling `change_booking_status(..., 'confirmed')` gets an error; the partner succeeds; `booking_events` has a row.
5. Upload to `partners/<other partner>/...` is denied; upload to own folder works; a file over 8 MB or a non-image is rejected.
6. Run the E2E suite against a staging deploy with `DEMO_MODE=true` previews, then do a manual pass with `DEMO_MODE=false`.
7. With a real `ANTHROPIC_API_KEY`: plan five varied prompts in EN/RU/KY and confirm the UI shows "Planned by Claude" and every price matches the listing page.
