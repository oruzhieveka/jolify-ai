# JOLIFY AI

AI travel planner and local-business marketplace for Kyrgyzstan. Travellers describe a trip in plain language and get a day-by-day itinerary built **only** from destinations and listings stored in the database, with prices taken from the database. They can save trips and send booking requests to local businesses. Partners apply, manage listings and answer requests. Admins moderate partners and listings and see usage metrics.

UI languages: English, Russian, Kyrgyz (`/en`, `/ru`, `/ky`). Russian and Kyrgyz cover the public traveller pages; dashboards and partner/admin forms are English-only for now (see `docs/BACKLOG.md`).

> **Status: v0.1.0, pre-release.** Unit tests and an offline smoke run pass. `next build`, a real Supabase project, a real Anthropic call and a Netlify deploy have **not** been run yet. See [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, RLS) · Anthropic Messages API · MapLibre GL (switchable tile providers) · Zod · Sentry (optional) · Playwright · Netlify.

UI primitives are small local components in `src/components/ui` written in the shadcn/ui style (Tailwind + `cn()` helper). The shadcn CLI is not used.

## Quick start (demo mode, no accounts needed)

Requires Node.js 22.6 or newer.

```bash
npm install
cp .env.example .env.local      # DEMO_MODE=true by default
npm run dev                     # open localhost:3000
```

Demo mode uses in-memory sample data, a demo sign-in page (traveller / partner / admin), and the deterministic rules planner unless `ANTHROPIC_API_KEY` is set. Every page shows a **DEMO** banner. Nothing is persisted; restarting the server resets the data. Details: [`docs/SETUP.md#demo-mode`](docs/SETUP.md#demo-mode).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` over the whole repo |
| `npm run typecheck:core` | Type-check only the framework-free core, server handlers and tests (works before `next` types exist) |
| `npm run lint` | ESLint (`next/core-web-vitals`, `next/typescript`); not run during `build` |
| `npm test` | Unit/integration tests (`node --test`, no extra deps) |
| `npm run test:e2e` | Playwright E2E against a production build in demo mode |
| `npm run db:seed-sql` | Regenerate `supabase/seed.sql` from `src/core/seed` |

## Documentation

| File | Contents |
|---|---|
| [`docs/PROJECT.md`](docs/PROJECT.md) | Product scope, roles, feature inventory, rules |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Code layout, request flow, AI pipeline, data model, security |
| [`docs/SETUP.md`](docs/SETUP.md) | Env vars, Supabase, Anthropic, maps, Netlify, demo mode |
| [`docs/TESTING.md`](docs/TESTING.md) | Unit tests, E2E suite, what has and has not been verified |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | 10 phases with current status |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Open work items |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Technical decisions (ADR style) |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | What does not work yet or is unverified |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Release notes |

## Going to production (summary)

1. Create a Supabase project, apply `supabase/migrations/*.sql` in order, then `supabase/seed.sql`.
2. Set the environment variables from `.env.example` (`DEMO_MODE=false`, Supabase keys, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`).
3. `npm run build` locally and fix anything it reports.
4. Connect the GitHub repo to Netlify and add the same variables.
5. Sign in once, then promote your account to admin with SQL.

Full instructions: [`docs/SETUP.md`](docs/SETUP.md).

## Core rules the code enforces

- The AI returns destination and listing **IDs only**; names, prices and coordinates are filled in from the database and the result is validated before display. If validation fails twice, the rules planner is used and the UI says so.
- Booking requests start as `pending`. Only the partner (or an admin) can confirm. Nothing auto-confirms.
- Partner consents are stored per consent with status, timestamp, policy version and user ID.
- Sample partners and listings are flagged `is_demo` and labelled "Sample listing" in the UI.
