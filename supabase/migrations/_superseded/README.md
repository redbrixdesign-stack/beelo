# Superseded Migrations

These migration files were archived because they conflicted with the authoritative migration sequence (002-006).

## 001_initial_schema.sql (archived 2026-08-09)

**Problems:**
1. **Duplicate table definitions** — Created all 22 tables that are also created in 002-005, causing "relation already exists" errors when run in sequence.
2. **Wrong primary key type** — Used `BIGSERIAL` (auto-incrementing integer) instead of `UUID` with `gen_random_uuid()`, inconsistent with the rest of the schema and with `docs/Architect.md` which specifies UUID keys.
3. **Financially dangerous default** — `hmrc_mileage_rate_tier1 DEFAULT 55.00` — this is £55/mile, **100x the correct rate of 55p/mile (0.55)**. The correct value is in `002_create_advisor_table.sql` (DEFAULT 0.55).
4. **Missing `NOT NULL` discipline** — Many columns lack `NOT NULL` constraints that exist in the authoritative migrations.
5. **Provenance fields in Phase 1** — Included `model_version`, `prompt_version`, `confidence` columns on `documents` table, but per `plan.yaml` and `Architect.md` these are only added in Phase 3 when AI extraction begins.

## 20260807_phase2_entities.sql (archived 2026-08-09)

**Problems:**
1. **Third copy of Phase 2 tables** — Creates `leads`, `call_attempts`, `voice_notes` which already exist in `005_create_remaining_tables.sql` (migration 005). Running both fails with "relation already exists".
2. **Different RLS policy style** — Uses explicit SELECT/INSERT/UPDATE/DELETE policies instead of the consolidated `FOR ALL USING (...)` style used in 002-005. Functionally equivalent but inconsistent.

## Authoritative Migration Sequence

The correct sequence is now:
- `001_enable_extensions.sql` — uuid-ossp extension
- `002_create_advisor_table.sql` — advisors (UUID PK, correct HMRC defaults)
- `003_create_customers_table.sql` — customers
- `004_create_visits_table.sql` — visits
- `005_create_remaining_tables.sql` — leads, call_attempts, voice_notes, documents, fit_line_items, incidents, quote_line_items, commission_line_items, trips, expenses, message_drafts, schedule_suggestions, measurement_checks
- `006_create_updated_at_triggers.sql` — updated_at trigger function + triggers
- `007_create_phase3_5_tables.sql` — delivery_drop_notes, settings, dor_predictions, onboarding_state, pilot_metrics (from archived 001, rewritten to match 002-006 style)

**Total: 21 tables, all UUID PKs, all RLS from line 1, all with source_env, no duplicate definitions.**