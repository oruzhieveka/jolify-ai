# scripts

`gen-seed-sql.ts` prints SQL for the seed data in `src/core/seed` (destinations, sample partners, sample listings). Run it with `npm run db:seed-sql`, which writes `supabase/seed.sql`.

The seed data was originally extracted from the `visit-kyrgyzstan-ai` HTML prototype (its `DESTS`, `PARTNERS` and `SEED_LISTINGS` arrays). Partners and listings are flagged `is_demo` and labelled as samples in the UI.
