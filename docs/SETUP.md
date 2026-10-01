# Setup

- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Demo mode](#demo-mode)
- [Supabase](#supabase)
- [Anthropic](#anthropic)
- [Maps](#maps)
- [Sentry](#sentry-optional)
- [Netlify deployment](#netlify-deployment)
- [Production checklist](#production-checklist)

## Requirements

- Node.js **22.6+** (tests use `--experimental-strip-types`; Netlify is pinned to Node 22 in `netlify.toml`)
- npm
- For production: a Supabase project, an Anthropic API key, and a Netlify account connected to GitHub

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment variables

All variables are listed in `.env.example`. Variables starting with `NEXT_PUBLIC_` are sent to the browser. **Never** put a secret in a `NEXT_PUBLIC_` variable.

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `DEMO_MODE` | yes | server | `true` = in-memory demo. `false` = Supabase. Demo mode is also forced when `NEXT_PUBLIC_SUPABASE_URL` is empty |
| `NEXT_PUBLIC_SITE_URL` | yes | public | Canonical origin, used for sitemap, robots and metadata (e.g. your Netlify URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | public | Supabase anon key (safe in the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | prod | **secret** | Server-only; used for analytics inserts and admin metrics reads |
| `ANTHROPIC_API_KEY` | recommended | **secret** | Enables Claude planning. Empty = rules planner |
| `ANTHROPIC_MODEL` | no | server | Default `claude-sonnet-4-5` |
| `NEXT_PUBLIC_MAP_PROVIDER` | no | public | `openfreemap` (default, no key) / `maptiler` / `custom` |
| `NEXT_PUBLIC_MAPTILER_KEY` | if maptiler | public | MapTiler key (restrict it to your domain in the MapTiler dashboard) |
| `NEXT_PUBLIC_MAP_STYLE_URL` | if custom | public | Any MapLibre style JSON URL |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | no | public / server | Enable Sentry in the browser / server |
| `SENTRY_ORG`, `SENTRY_PROJECT` | no | build | Source-map upload during build (also needs `SENTRY_AUTH_TOKEN`) |
| `AI_RATE_LIMIT_PER_MINUTE` | no | server | Per-user (or per-IP when anonymous) limit for AI endpoints (default 8) |

## Demo mode

Demo mode is active when `DEMO_MODE=true` **or** `NEXT_PUBLIC_SUPABASE_URL` is empty.

| | Demo mode | Supabase mode |
|---|---|---|
| Data | `MemoryRepo`: seed data in server memory, reset on restart | Postgres via `SupabaseRepo` |
| Sign-in | `/login` shows three demo accounts (traveller, partner, admin). No password | Email magic link |
| AI | Rules planner, or Claude if `ANTHROPIC_API_KEY` is set | Same |
| Image upload | Disabled (API returns 501, UI says so) | Supabase Storage |
| Banner | "DEMO" banner on every page | None |

The demo partner account manages the two sample businesses `p-nomad` and `p-tienshan`.

**Do not use demo mode for a public production site.** Anyone can sign in as the demo admin, and on serverless hosting each function instance has its own memory, so data may differ between requests and disappears on cold start. It is meant for local development, previews and E2E tests.

## Supabase

1. Create a project at supabase.com (pick a region near your users, e.g. Frankfurt).
2. **Apply the migrations in order.** Use either:
   - **SQL editor**: paste and run `supabase/migrations/0001_schema.sql`, then `0002_security.sql`, then `0003_storage.sql`; or
   - **CLI**: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. **Seed content**: run `supabase/seed.sql` in the SQL editor. It loads 20 destinations, 6 sample partners and 48 sample listings (all `is_demo = true`). It is idempotent (`on conflict ... do update`). To regenerate after editing `src/core/seed`, run `npm run db:seed-sql`.
4. **Auth** (Authentication → URL configuration):
   - Site URL: your production origin (e.g. `jolify.netlify.app` with https)
   - Redirect URLs: add `<origin>/api/auth/callback` for production, each preview origin, and `localhost:3000` for local dev
   - Email provider: enabled (magic link). Configure custom SMTP before launch, because the built-in sender is heavily rate-limited.
5. **Keys** (Project settings → API): copy the URL, `anon` key and `service_role` key into your env.
6. **Make yourself admin**: sign in once through the app (this creates your `profiles` row), then in the SQL editor run:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Role changes are blocked for normal users by a trigger. The SQL editor runs as `postgres`, which is allowed.
7. **Partners** become partners by applying on `/partner` and being approved in `/admin`. Approval runs `approve_partner_application`, which creates the partner row and the membership.
8. **Storage**: `0003_storage.sql` creates the public `media` bucket and its policies. Nothing else is needed.

> The SQL and the `SupabaseRepo` have **not yet been run against a real Postgres instance**. Expect to fix small issues on first apply, and run the RLS checks in `TESTING.md`.

## Anthropic

- Create a key at console.anthropic.com and set `ANTHROPIC_API_KEY` (server-only). Optionally set `ANTHROPIC_MODEL` to any current Claude model id that supports tool use.
- The integration is a direct `fetch` to the Messages API (`src/server/ai/anthropic.ts`), not the SDK, with:
  - `tool_choice` forced to the `create_itinerary` tool (structured output);
  - the catalogue context sent as a system block with `cache_control: ephemeral` (prompt caching);
  - `max_tokens` 4096, temperature 0.4, and a 45 s timeout.
- The model only chooses **ids**. Prices and names come from the database (`hydrate`), and every result is validated. There is one retry with the validator errors, then the rules fallback. See `ARCHITECTURE.md#ai-pipeline-anthropic`.
- Check `/api/health`: `"ai":"anthropic"` means the key is present (it does not prove the key works). The planner shows "Planned by Claude" only when Claude's output passed validation.
- Cost control: AI endpoints are rate-limited per user or IP (`AI_RATE_LIMIT_PER_MINUTE`). Also set a monthly spend limit in the Anthropic console.

## Maps

All providers render with MapLibre GL. Choose one with `NEXT_PUBLIC_MAP_PROVIDER`:

| Value | Needs | Style |
|---|---|---|
| `openfreemap` (default) | nothing | OpenFreeMap "liberty" (OpenStreetMap data) |
| `maptiler` | `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler "outdoor-v2". Falls back to OpenFreeMap if the key is empty |
| `custom` | `NEXT_PUBLIC_MAP_STYLE_URL` | Any MapLibre style JSON |

Logic lives in `src/lib/map-provider.ts`. Attribution is shown on the map. If the style cannot load, the map area shows an error message and the list beside it keeps working.

## Sentry (optional)

Set `NEXT_PUBLIC_SENTRY_DSN` (browser) and/or `SENTRY_DSN` (server). Without a DSN Sentry is not initialised and the build config is not wrapped. For source maps add `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` in Netlify.

## Netlify deployment

`netlify.toml` sets `npm run build`, publish dir `.next` and Node 22. Netlify detects Next.js and uses its Next.js runtime (OpenNext adapter) automatically. Middleware runs as a Netlify Edge Function.

1. Push the repository to GitHub.
2. Netlify → *Add new site* → *Import an existing project* → pick the repo. Keep the detected build settings.
3. *Site configuration → Environment variables*: add every variable you need from the table above, with `DEMO_MODE=false` and `NEXT_PUBLIC_SITE_URL` set to the site URL. Mark `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` as secret.
4. Deploy. Then add the Netlify URL (and any custom domain) to Supabase Auth redirect URLs.
5. Verify `/api/health` returns `"mode":"supabase"` and the expected `ai` value.
6. Deploy previews: either give them a separate Supabase project, or set `DEMO_MODE=true` for the *Deploy previews* context only.

## Production checklist

- [ ] `npm run build`, `npm run typecheck`, `npm test` and `npm run test:e2e` pass locally
- [ ] Migrations and seed applied; RLS checks from `TESTING.md` done
- [ ] Admin account promoted; demo sign-in returns 404 (`DEMO_MODE=false`)
- [ ] Sample partners and listings removed or replaced with real, consented businesses (`delete from public.listings where is_demo; delete from public.partners where is_demo;`; delete any bookings or reviews that reference them first)
- [ ] Legal drafts reviewed by a lawyer and the `PARTNER_POLICY_VERSION` (`src/core/consent.ts`) set to the published version
- [ ] Custom SMTP configured in Supabase
- [ ] Anthropic spend limit set
- [ ] Sentry DSN set (recommended)
