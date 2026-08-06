# PR: Phase 1 — Foundation

**Phase:** 1 (Weeks 1–2)
**Status:** Ready for review
**Branch:** `phase-1-foundation`

---

## Summary

Phase 1 establishes the complete foundation for Beelo: authentication, advisor profile with HMRC mileage config, RLS-isolated schema for all entities, offline-first Dexie storage with sync queue, Customer/Visit CRUD with validated outcome taxonomy, and mobile-first PWA navigation. No AI, no provenance fields.

---

## What Was Built

### Auth & Advisor Profile
- Supabase Auth (email/password + magic link) with session persistence
- Advisor onboarding flow: creates `advisors` row linked to `auth.users`
- Profile page edits: business details, commission/VAT/tax rates, `full_job_minutes_per_blind`, weekly target, **HMRC mileage rates (tier1, tier2, threshold) as config**

### Database Schema (All Entities, RLS from Line 1)
- 6 migrations creating 16 tables + enums + triggers
- Every table has RLS policy: `advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())`
- `source_env` (`demo`|`qa`|`live`) on every record
- **Job code constraint**: `CHECK (job_code ~ '^[A-Z]\d{3}[A-Z]?$')`
- **Measurement units**: cm (MeasurementCheck table uses `NUMERIC(6,2)` for cm values)
- No provenance fields (added in Phase 3)

### Offline-First Architecture
- Dexie/IndexedDB as local source of truth (schema mirrors Supabase)
- Sync queue table (Dexie-only): `entityType`, `entityId`, `operation`, `payload`, `status`, `retryCount`, `lastError`
- Sync processor: batches pending ops, pushes to Supabase, last-write-wins + financial-field diff
- Online/offline detection + honest UI states ("Queued — will sync when online")

### Customer CRUD
- List page: searchable, sortable, pull-to-refresh
- Form: `customer_number` (unique per advisor), phone, postcode, address, display_name
- Detail page with visit history
- All writes → Dexie → sync queue

### Visit CRUD + Outcome Taxonomy
- List page: filter by date, status, outcome
- Form: all Visit fields per Architect.md §11
- Job code validated against `^[A-Z]\d{3}[A-Z]?$`
- Outcome dropdown: 12 validated values (Ordered, Quoted, Needs to Think, Talk to Partner, Comparing Quotes, Too Expensive, Spec Mismatch, Not What They Wanted, Not in Range, Windows Too High, Customer No Show, Advisor Could Not Attend)
- `appointment_type`: sales | survey | fit | service_call
- `job_source`: self_sold | company_assigned
- `estimated_duration_minutes = blind_count × full_job_minutes_per_blind` (advisor config)

### Mobile-First PWA Navigation
- Bottom tab bar: Home, Visits, Customers, Profile
- Header with `source_env` badge + sync status indicator
- Workbox service worker (cache-first assets, offline shell)
- Install prompt handling
- Responsive layout (mobile-first)

### Sync Status UI
- Persistent header badge: `Synced` | `Pending N` | `Offline`
- Sync queue panel: lists pending ops, retry failed items
- Honest offline messaging

---

## Key Decisions Documented

| Decision | Rationale |
|----------|-----------|
| All 16 entity tables created in Phase 1 | `PROJECT_SETUP_PLAN.md` §5: "RLS-isolated schema for ALL entities" — avoids migration churn later |
| No provenance fields on Document table | `Architect.md` §13 & `PROJECT_SETUP_PLAN.md` §5 explicitly: "No AI, no provenance fields" for Phase 1 |
| `estimated_duration_minutes` computed client-side | `BusinessRules.md` §55-56: `full_job_minutes_per_blind` is advisor-configurable (~33 min default) |
| MeasurementCheck uses cm with `NUMERIC(6,2)` | `BusinessRules.md` §45: units are centimetres, default tolerance 1cm |
| Sync queue is Dexie-only | `PROJECT_SETUP_PLAN.md` §4: "sync_queue table (Dexie-only, not synced to Supabase)" |

---

## Manual Test Checklist (3 items, ~5 min each)

### 1. Offline Capture & Sync
```
1. Open app, sign in
2. Enable airplane mode
3. Create a Customer → verify appears in list immediately
4. Create a Visit for that customer → verify appears in list
5. Disable airplane mode
6. Watch sync badge: "Pending 2" → "Synced"
7. Verify data in Supabase dashboard (correct advisor_id, source_env)
```

### 2. Auth + Profile Persistence
```
1. Sign up new account (email + password)
2. Complete advisor profile (all fields including HMRC rates)
3. Sign out
4. Sign in again
5. Verify profile loads with all values intact
6. Verify `advisors` row has `auth_user_id` linked correctly
```

### 3. RLS Isolation
```
1. In Supabase dashboard, create two advisor accounts (different emails)
2. Sign in as Advisor A → create Customer + Visit
3. Sign in as Advisor B → verify Customer/Visit lists are empty
4. Run direct SQL as Advisor B: `SELECT * FROM customers;` → returns 0 rows
```

---

## Non-Negotiables Verified

- [ ] All tables have RLS keyed to `advisor_id` via `auth.uid()`
- [ ] Job code validation uses regex `^[A-Z]\d{3}[A-Z]?$`
- [ ] Measurement units documented as cm (not mm)
- [ ] HMRC mileage rates stored on Advisor record (config)
- [ ] `source_env` flag on every record + visible UI badge
- [ ] No AI code, no provenance fields
- [ ] Dexie is local source of truth; all writes through sync queue
- [ ] Offline capture works; UI never blocks on network
- [ ] Sync queue visible with honest pending state
- [ ] Single Supabase project (local/preview/prod via `source_env`)

---

## Commands

```bash
# Install
npm install

# Dev (with local Supabase)
supabase start
npm run dev

# Test
npm run test

# Lint
npm run lint

# Typecheck
npm run typecheck

# Build
npm run build

# Preview build
npm run preview
```

---

## Environment Variables Required

```env
VITE_SUPABASE_URL=http://localhost:54321  # local Supabase
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Next Phase (Phase 2)

Lead + CallAttempt + VoiceNote entities, voice capture UI (platform-assistant shortcut), transcription pipeline, downtime-gap detection, batch review UI, screenshot-proximity and manual matching.

---

**Reviewer:** Founder
**Review Date:** ___________
**Approval:** ☐ Approved  ☐ Needs Changes