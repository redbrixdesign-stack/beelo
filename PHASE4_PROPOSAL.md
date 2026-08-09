## Phase 4 Proposal — Protect the Schedule (Week 7)

### Scope (per `Architect.md` §13, §12 "Schedule-risk check")

| Feature | Spec Reference |
|---------|----------------|
| Blind-count schedule-risk computation | §12 "Schedule-risk check", §15 AI point 3 |
| ScheduleSuggestion entity + UI | §11 ScheduleSuggestion entity |
| Booking-confirmation drafting | §12 "Booking confirmation", §15 AI point 4 |
| Integration into visit creation flow | §12 "Booking confirmation" |
| Playwright E2E tests (offline flow) | `PROJECT_SETUP_PLAN.md` §5 Phase 4 |

---

### 1. File/Folder Structure (Phase 4 only)

```
supabase/
  functions/
    (no new Edge Functions - schedule risk is deterministic client-side)

src/
  features/
    schedule/
      hooks/
        useScheduleRisk.ts          # EXISTS - validate & enhance
        useScheduleSuggestions.ts   # NEW - CRUD for ScheduleSuggestion
      components/
        ScheduleRiskBanner.tsx      # NEW - banner on visit form/detail
        ScheduleSuggestionCard.tsx  # NEW - suggestion display
        BookingConfirmationDraft.tsx # NEW - draft message for approval
    visits/
      components/
        VisitForm.tsx               # ENHANCE - integrate risk check
      hooks/
        useVisits.ts                # ENHANCE - trigger risk check on create
  lib/
    constants.ts                    # ADD: SCHEDULE_RISK_THRESHOLDS
  e2e/
    schedule-risk.spec.ts           # NEW - Playwright E2E
    offline-flow.spec.ts            # NEW - Playwright offline tests
```

---

### 2. Schema (no new migrations needed)

**Existing `schedule_suggestions` table** (from migration 005) has all required fields:
- `advisor_id`, `date`, `suggestion_text`, `affected_visit_ids`, `estimated_saving_miles`, `estimated_saving_minutes`, `schedule_risk_flag`, `status`

**RLS** already enabled with advisor isolation.

---

### 3. Business Rules to Enforce

| Rule | Where |
|------|-------|
| `estimated_duration = blind_count × full_job_minutes_per_blind` (default 33 min) | `useScheduleRisk.ts` |
| Risk if gap to next visit < estimated_duration + 15 min buffer | `useScheduleRisk.ts` |
| Suggestion: reorder visits to minimize mileage | `useScheduleSuggestions.ts` |
| Booking confirmation: asks about parking + clear windows | `BookingConfirmationDraft.tsx` |
| Draft always user-approved before sending | `BookingConfirmationDraft.tsx` |

---

### 4. Validation Checklist (Validator must PASS)

| Check | Evidence Required |
|-------|-------------------|
| `npm run build` / `npm run test` | All pass |
| Schedule risk: 3 blinds → 99 min → warns if next visit < 114 min | Unit test |
| Suggestion generated for cluster of visits same area | Manual test with 3+ visits |
| Booking confirmation draft includes parking/windows questions | Manual test |
| Playwright: create visit → risk banner appears | E2E test |
| Playwright: offline visit creation → queues → syncs online | E2E test |
| Playwright: full offline→online roundtrip | E2E test |

---

### 5. What's NOT in Phase 4

- ❌ Full routing engine (MapLibre + OSRM for actual mileage calc) — later
- ❌ Delivery-drop-note OCR (Phase 5)
- ❌ Expense capture (Phase 5)
- ❌ Onboarding, backup, metrics (Phase 5)

---

**Ready for go-ahead?** If approved, I'll:
1. Enhance `useScheduleRisk` with buffer logic
2. Build `useScheduleSuggestions` + `ScheduleRiskBanner` + `BookingConfirmationDraft`
3. Integrate into `VisitForm` (risk check on blind_count change)
4. Add Playwright E2E tests for schedule risk + offline flow
5. Run Validator checklist