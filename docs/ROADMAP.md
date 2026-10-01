# Roadmap

Status key: **Done** = code exists and passes the tests in `TESTING.md`. **Done (unverified)** = code exists but has not been run against the real service. **Not started** = no code.

| # | Phase | Status | Exit criteria |
|---|---|---|---|
| 1 | Foundation | Done | Next.js app, TS strict, Tailwind theme, UI primitives, EN/RU/KY routing, env handling, demo mode |
| 2 | Data and security | Done (unverified) | Schema, RLS on every table, guards, RPCs, storage policies and seed applied to a real Supabase project without errors; RLS checks in `TESTING.md` pass |
| 3 | Destinations and maps | Done (map tiles unverified) | 20 destinations, detail pages, MapLibre map with switchable provider, clustering, list–map sync |
| 4 | AI planner | Done (real Claude unverified) | Anthropic tool call → hydrate → validate → retry → rules fallback; modify; save trips. Exit: five real prompts per language pass validation via Claude |
| 5 | Marketplace and booking requests | Done | Sections, filters, listing pages, booking requests, partner-only confirmation, message thread |
| 6 | Partner onboarding | Done (upload unverified) | Application with recorded consent, admin approval, partner dashboard, listings with moderation, image upload to Storage |
| 7 | Admin and analytics | Done | Moderation queues, metrics from stored events, no fabricated numbers |
| 8 | Quality and launch readiness | In progress | `next build` passes; E2E suite green on a real build; RLS checks; Sentry on; RU/KY for dashboards; sample data replaced; legal review; deploy to Netlify |
| 9 | Engagement | Not started | Favourites UI, reviews after completed bookings, profile editing, partner gallery display, email notifications for new requests |
| 10 | Scale and monetisation | Not started | Payments / deposits, distributed rate limiting, semantic search (pgvector) if the catalogue outgrows the id-context approach, partner subscriptions |

The detailed items behind phases 8–10 are in `BACKLOG.md`.
