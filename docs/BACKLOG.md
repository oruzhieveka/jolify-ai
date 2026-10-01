# Backlog

Priority: **P0** before public launch · **P1** soon after launch · **P2** later. Roadmap phase in brackets.

## P0: verification and launch blockers [8]

- [ ] Run `npm install` and `npm run build`; fix any type or build errors from the real Next.js / Supabase / Sentry types. The code was type-checked only against local stand-in type definitions.
- [ ] Run `npm run lint` and fix findings (ESLint config is present but has never run).
- [ ] Run the Playwright suite against a real build and fix selectors/timings.
- [ ] Apply migrations and seed to a real Supabase project; fix SQL issues.
- [ ] Exercise `SupabaseRepo` end to end (it has no automated tests; all handler tests use `MemoryRepo`).
- [ ] Perform the RLS / storage checks listed in `TESTING.md` §4.
- [ ] Test with a real `ANTHROPIC_API_KEY` in EN/RU/KY; tune the prompt if validation rejects often.
- [ ] Verify map tiles load from OpenFreeMap (and MapTiler, if used) in production.
- [ ] Verify Tailwind styling visually on desktop and mobile; nothing has been rendered with CSS yet.
- [ ] Replace sample partners and listings with real businesses that have consented, or remove them.
- [ ] Legal review of the terms, privacy policy and partner terms drafts; publish and set `PARTNER_POLICY_VERSION`.
- [ ] Configure custom SMTP in Supabase Auth.
- [ ] First Netlify deploy; confirm middleware (edge) and API routes work there.

## P1: completeness [8, 9]

- [ ] Russian and Kyrgyz for partner dashboard, admin, partner application form, login page and legal pages (currently English; `dict.ts` falls back to EN). Have native speakers review the existing RU/KY strings.
- [ ] Destination descriptions in RU/KY (seed has EN descriptions; names are in all three).
- [ ] Listings have no coordinates of their own. Add lat/lon in the listing form and seed so the map stops using the destination centre ("approximate").
- [ ] Marker overlap at high zoom for many listings at one destination centre (cluster spiderfy or offsets).
- [ ] Display uploaded media on listing pages and cards (upload exists; there is no gallery).
- [ ] Listing editing and archiving by partners in the UI (`updateListing` exists in the Repo, but there is no route or form).
- [ ] Email notification to partners on new booking requests, and to travellers on status changes.
- [ ] Profile editing (name, phone, preferred language).
- [ ] Distributed rate limiting (e.g. Upstash/Netlify Blobs or a Postgres table). The current limiter is in-memory per instance.

## P2: growth [9, 10]

- [ ] Favourites UI/API (table and RLS exist).
- [ ] Reviews after `completed` bookings (table and RLS exist).
- [ ] Payments or deposits (out of scope by decision D-006; bookings are requests only).
- [ ] pgvector semantic search over listings/destinations, only if the catalogue grows past what fits in the id context (see D-002).
- [ ] OG images per destination.
- [ ] Admin tools: edit destinations, suspend partners, export analytics.
- [ ] CI workflow (GitHub Actions: typecheck, test, build, E2E).
