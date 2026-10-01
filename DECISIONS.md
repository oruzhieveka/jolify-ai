# Technical decisions

Each entry records what was decided, why, and the consequences. All are **Accepted** unless stated otherwise.

## D-001 — Anthropic (Claude) as the LLM provider

- **Decision**: Use the Anthropic Messages API from the server with a plain `fetch` client (`src/server/ai/anthropic.ts`), not the SDK. The model is configurable via `ANTHROPIC_MODEL`.
- **Why**: This is the product owner's choice. Forced tool use gives structured output. Prompt caching reduces the cost of the catalogue context. Using `fetch` avoids a dependency and is easy to mock in tests.
- **Consequences**: The key is server-only. One provider; adding another would mean implementing the same `callItineraryTool` contract.

## D-002 — AI selects ids; the database supplies facts and prices (skeleton + hydrate)

- **Decision**: The model gets a compact list of relevant destination and listing ids with categories and prices, and returns an **id-only skeleton**. `hydrate()` fills in names, coordinates and prices from the database, and `validateItinerary()` checks grounding before anything is shown or saved.
- **Why**: This makes "the AI never invents prices, businesses or availability" a property of the code rather than of the prompt. A hallucinated id is detected and rejected; a price cannot be wrong because the model never outputs one.
- **Alternatives**: Tool-calling RAG over pgvector (an earlier plan) is **not implemented**. With 20 destinations and tens of listings the whole relevant catalogue fits in the context. pgvector stays a future option (BACKLOG P2).
- **Consequences**: Context size grows with the catalogue. `catalogContext` already filters by the parsed request, but a much larger catalogue will need retrieval.

## D-003 — Deterministic rules planner as fallback and demo engine

- **Decision**: A rules planner (`core/planner.ts`) and modifier (`core/modify.ts`) produce valid itineraries without an LLM. They are used when no key is configured, when Claude's output fails validation twice, or when the API errors or times out. Known modify intents always use the rules modifier first.
- **Why**: The planner always works and costs nothing, and exact edits ("make day 2 cheaper") are more reliable deterministically.
- **Consequences**: The UI must say which engine produced the plan, and it does. Rules output is less varied than Claude's.

## D-004 — MapLibre GL with switchable tile providers

- **Decision**: MapLibre GL renders all maps. The style comes from `NEXT_PUBLIC_MAP_PROVIDER`: OpenFreeMap (default, no key), MapTiler (key), or any custom style URL.
- **Why**: Open source and no vendor lock-in; works with no key; good OSM coverage of Kyrgyzstan.
- **Consequences**: "Open in maps" / "directions" links hand off to external apps for navigation. There is no routing engine in the app; the route line connects day locations in order.

## D-005 — Repo abstraction with an in-memory demo mode

- **Decision**: All data access goes through the `Repo` interface (`server/repo.ts`) with two implementations: `MemoryRepo` (demo mode and tests) and `SupabaseRepo` (production). Demo mode is on when `DEMO_MODE=true` or Supabase is not configured.
- **Why**: The full app runs and is testable without external services, and handlers are tested without a database.
- **Consequences**: There are two implementations to keep in sync. `SupabaseRepo` is untested so far (BACKLOG P0). Demo mode must never be used for a real public site (anyone can be the demo admin).

## D-006 — Booking requests, partner confirmation required, no payments

- **Decision**: Travellers send requests (`pending`). Only the listing's partner or an admin can confirm or reject. Statuses: pending, confirmed, rejected, cancelled, completed. Nothing auto-confirms, and the app takes no payments.
- **Why**: There is no real availability data, and inventing availability is forbidden. Lead generation first.
- **Consequences**: The same transition matrix is enforced in TypeScript (`core/bookings.ts`) and in SQL (`change_booking_status`).

## D-007 — Supabase (Postgres + Auth + Storage) with RLS as the security boundary

- **Decision**: One Supabase project. User-scoped queries run with the user's session so RLS applies. The service role is used only for analytics inserts. Guard triggers protect roles, verification, listing status and `is_demo`.
- **Why**: Defence in depth: even a bug in a handler cannot read or modify other users' data.
- **Consequences**: Every policy must be tested on a real project before launch.

## D-008 — Netlify for hosting

- **Decision**: Deploy on Netlify with its Next.js runtime. `netlify.toml` pins Node 22.
- **Why**: The product owner's choice; Git-based deploys and previews.
- **Consequences**: Serverless functions are stateless, so the in-memory rate limiter and demo store are per instance (see `KNOWN_LIMITATIONS.md`).

## D-009 — Modular monolith; framework-free core

- **Decision**: One Next.js app. Domain logic lives in `src/core` with no framework imports and explicit `.ts` import extensions.
- **Why**: The core runs under plain `node --test` and is shared by the API, pages and seed generator.

## D-010 — Multilingual content as jsonb `{en, ru, ky}`; UI strings in one dictionary

- **Decision**: Content fields are jsonb with per-language keys. UI strings live in `src/i18n/dict.ts`, with RU/KY falling back to EN per key. Locale is the first URL segment.
- **Consequences**: Missing translations show English rather than breaking.

## D-011 — Partner consent stored per consent with policy version

- **Decision**: Each consent (partner terms, data processing, listing accuracy, optional marketing) is a `consents` row with status, timestamp, policy version and user id. The client must send the current `PARTNER_POLICY_VERSION`, or the application is rejected.
- **Why**: An auditable record of consent.

## D-012 — Local shadcn-style UI primitives

- **Decision**: A small set of components in `src/components/ui` (Button, Card, Badge, Input, Select, Alert, and so on) in the shadcn/ui style. The shadcn CLI and Radix are not used.
- **Why**: Fewer dependencies for the current UI surface. Components can be replaced with generated shadcn components later without changing pages much.
