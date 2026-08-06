# Validation Report: Phase 1 — Foundation

**Status:** FAIL

## Automated Checks

- **Lint:** FAIL — 33 errors, 12 warnings
- **Typecheck:** FAIL — 80+ TypeScript errors
- **Unit Tests:** PASS — 52 passing (43 lib + 9 Button)
- **E2E Tests:** SKIPPED — Phase < 4

## Non-negotiable Verification

| # | Non-negotiable | Status | Evidence |
|---|---|---|---|
| 1 | Voice-first, single-control | PASS | Bottom nav with 48px tap targets; no multi-step forms before save; capture-first UI patterns in LoginForm, CustomerForm, VisitForm |
| 2 | Offline-first capture | PASS | Dexie writes before network in all forms (CustomerForm, VisitForm, ProfileForm); airplane-mode test documented in PR.md; `useSync` shows honest "Queued — will sync when online" |
| 3 | AI server-side only | PASS | No `anthropic`/`claude` imports in client code; no AI code in Phase 1 (by design); all AI deferred to Phase 3 Edge Functions |
| 4 | AI output = draft | PASS | No AI outputs in Phase 1; `MessageDraft` entity has `status: 'draft' | 'sent' | 'discarded'`; sync queue marks items `pending` not `synced` until server confirms |
| 5 | RLS on every table | PASS | All 6 migrations include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY ... USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))` on every table |
| 6 | Money/percent validation | PASS | Zod schemas in `src/lib/validation.ts`: `moneySchema` (positive, 2dp), `percentageSchema` (0-100), `jobCodeSchema` (regex `^[A-Z]\d{3}[A-Z]?$`); used in CustomerForm, VisitForm, ProfileForm |
| 7 | External lookups fail visibly | PARTIAL | No geocoding in Phase 1; Supabase errors caught and surfaced via `useToast` in all forms; network failures queue to sync with retry; no silent failures |
| 8 | cm units / HMRC config | PASS | `MeasurementCheck` table uses `NUMERIC(6,2)` for cm fields (`width_top_cm`, etc.); Advisor has `hmrc_mileage_rate_tier1/2`, `hmrc_mileage_threshold_miles` config fields; no hardcoded rates |
| 9 | Solo-user only | PASS | All RLS policies scope to single `advisor_id`; no multi-user assumptions in code or schema; `advisors` table has unique `auth_user_id` |

## PR.md Completeness

- **What built:** COMPLETE — detailed in Phase 1 PR.md
- **Judgment calls:** COMPLETE — 5 documented in plan.yaml
- **Test checklist:** COMPLETE — 3 items (offline sync, auth persistence, RLS isolation)
- **Non-negotiables checklist:** COMPLETE — all 9 items
- **Blockers:** DOCUMENTED — TypeScript/lint errors listed below

## Issues Requiring Fix

### Lint Errors (33 errors, 12 warnings)
- `src/components/customers/CustomerForm.tsx` — 3 `any` types
- `src/components/customers/CustomerList.tsx` — 2 `any` types
- `src/components/visits/VisitForm.tsx` — 3 `any` types
- `src/components/visits/VisitList.tsx` — 2 `any` types
- `src/lib/sync.ts` — 2 `any` types
- Multiple pages — unused imports (`CustomerList`, `VisitList`, `CheckCircle`, `Shield`, `Database`, `signOut`, `SyncStatusBadge`, `AlertCircle`, `VisitForm`, `ChevronLeft`, `Calendar`, `Hash`, `Phone`, `MapPin`, `CustomerForm`)
- `src/pages/CustomerDetail.tsx` — unused `err` variable
- `src/pages/VisitDetail.tsx` — `any` type, unused `err`
- React hooks exhaustive-deps warnings (6 files)
- Fast refresh warnings (5 files)

### TypeScript Errors (80+)
- Missing `Select` component (referenced in CustomerForm, VisitForm, VisitList, OutcomeSelect, ProfileForm)
- `Input` component missing `leftIcon`, `multiline` props
- `Button` component missing `leftIcon` prop
- `Sync` icon not exported from `lucide-react`
- `Badge`/`Toast` spread type issues
- `Button.test.tsx` missing `@testing-library/react` exports
- `CustomerList.tsx` top-level `await`
- `useAuth.tsx` top-level `await` in useEffect
- Module resolution for `.tsx` hooks

### Test Infrastructure
- `@testing-library/dom` missing (installed with --legacy-peer-deps)

## Recommendation

**FIX_AND_REVALIDATE**

Phase 1 implements all required functionality per the plan, but code quality gates (lint, typecheck) are failing. These must be resolved before Phase 2 to avoid compounding technical debt.

### Priority Fixes
1. Create `Select` component in `src/components/ui/Select.tsx`
2. Add `leftIcon`, `multiline` props to `Input` component
3. Add `leftIcon` prop to `Button` component
4. Replace `Sync` icon with `RotateCcw` or `RefreshCw` from lucide-react
5. Fix `Badge`/`Toast` spread type annotations
6. Remove unused imports across pages
7. Fix `any` types with proper typing
8. Resolve module resolution for `.tsx` hooks (rename imports or add extensions)
9. Fix top-level `await` in `CustomerList.tsx` and `useAuth.tsx`

---

**Validator Agent**  
**Date:** 2026-08-07  
**Phase:** 1 — Foundation