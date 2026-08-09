## Phase 5 Proposal — Round It Out (Weeks 8–9)

### Scope (per `Architect.md` §13, `PROJECT_SETUP_PLAN.md` §5)

| Feature | Spec Reference |
|---------|----------------|
| Delivery-drop-note multi-fan-out OCR | §12 "Delivery drop note capture", §15 AI point 1 |
| Expense capture + OCR | §12 "Expense capture", §15 AI point 1 |
| DOR rolling-rate prediction display | §12 "Earnings and tax view", §15 AI point 5 |
| Export/backup (JSON) | §12 "Offline resume", §15 |
| Settings: HMRC rate config | §12 "Earnings and tax view", BusinessRules §Mileage |
| Onboarding flow (6 steps) | §12 "Offline resume" |
| Pilot metrics instrumentation | `PROJECT_SETUP_PLAN.md` §5 Phase 5 |
| Measurement checks validation | FR9 from PRD, already built |

---

### 1. File/Folder Structure (Phase 5 only)

```
supabase/
  functions/
    ocr-delivery-drop-note/      # EXISTS - validate
    ocr-expense-receipt/         # EXISTS - validate

src/
  features/
    delivery/
      hooks/
        useDeliveryDropNotes.ts   # NEW - CRUD for delivery_drop_notes
      components/
        DeliveryDropNoteView.tsx  # NEW - fan-out display
    expenses/
      hooks/
        useExpenses.ts            # NEW - CRUD for expenses
      components/
        ExpenseCapture.tsx        # NEW - receipt capture + category
        ExpenseList.tsx           # NEW - list with filters
        ExpenseReceiptView.tsx    # NEW - OCR results
    dor/
      hooks/
        useDORPrediction.ts       # NEW - rolling 4-week rate, trend
      components/
        DORPrediction.tsx         # NEW - chart + predicted penalty
    settings/
      hooks/
        useSettings.ts            # NEW - HMRC rates + backup/restore
      components/
        SettingsScreen.tsx        # ENHANCE - tabs
        HMRCRatesConfig.tsx       # NEW - editable tier1/tier2/threshold
        BackupRestore.tsx         # NEW - JSON export/import
    onboarding/
      hooks/
        useOnboarding.ts          # NEW - 6-step flow state
      components/
        OnboardingFlow.tsx        # NEW - welcome→profile→permissions→env→tutorial→complete
    pilot/
      hooks/
        usePilotMetrics.ts        # NEW - 8 metrics, time ranges
      components/
        PilotMetricsDashboard.tsx # NEW - dashboard + quick actions
    measurements/                 # ALREADY BUILT - validate
      hooks/useMeasurementChecks.ts
      components/MeasurementCheckForm.tsx
      components/MeasurementCheckList.tsx

  e2e/
    phase5-validation.spec.ts     # NEW - Playwright E2E for Phase 5
```

---

### 2. Schema (no new migrations needed)

**Existing tables** (from migrations 007, 005):
- `delivery_drop_notes` — job_code, customer_number, delivery_date, items (JSONB), fan_out_targets
- `expenses` — merchant, date, amount, vat_amount, category, photo_path, source_document_id
- `settings` — key/value per advisor
- `dor_predictions` — week_start/end, predicted/current DOR rate, blinds_at_risk, estimated_penalty
- `onboarding_state` — current_step, completed_steps, skipped_steps
- `pilot_metrics` — date, metric_name, metric_value, metadata
- `measurement_checks` — already validated

**RLS** already enabled with advisor isolation on all tables.

---

### 3. Business Rules to Enforce

| Rule | Where |
|------|-------|
| Delivery note: single document → fan out to customer/fitter/office | `useDeliveryDropNotes`, `DeliveryDropNoteView` |
| Expense categories: fuel/parking/materials/tools/subsistence/accommodation/training/insurance/phone/software/other | `ExpenseCapture`, `ExpenseList` |
| DOR prediction: rolling 4-week rate, trend projection, £20/£40 per blind | `useDORPrediction`, `DORPrediction` |
| HMRC rates: tier1 (55p), tier2 (25p), threshold 10k miles — editable | `HMRCRatesConfig` |
| Backup: full JSON export/import with upsert | `BackupRestore` |
| Onboarding: 6 steps, persist progress, skip allowed | `OnboardingFlow` |
| Pilot metrics: 8 KPIs, 3 time ranges (week/month/quarter) | `PilotMetricsDashboard` |

---

### 4. Validation Checklist (Validator must PASS)

| Check | Evidence Required |
|-------|-------------------|
| `npm run build` / `npm run test` / `npm run test:e2e` | All pass |
| Delivery OCR: photo → items extracted + fan-out targets shown | Test with real delivery note |
| Expense capture: photo → merchant/date/amount/VAT/category | Test with real receipt |
| DOR prediction: incidents with `countsTowardDor=true` → shows current/predicted rate, blinds at risk | Manual test |
| HMRC rates: change tier1 → save → persists | Manual test |
| Backup: export → import on another device → data restored | Manual test |
| Onboarding: complete all 6 steps → "All Set!" | Manual test |
| Pilot metrics: click quick actions → metrics increment | Manual test |
| Measurement checks: form with cm/min-of-3 logic works | Already validated |

---

### 5. What's NOT in Phase 5

- ❌ Full routing engine (MapLibre + OSRM) — later
- ❌ Team/multi-user features — never
- ❌ Accounting/VAT/MTD — out of scope
- ❌ Product catalogues — out of scope

---

**Ready for go-ahead?** If approved, I'll:
1. Validate existing Edge Functions (`ocr-delivery-drop-note`, `ocr-expense-receipt`)
2. Build client features for each area
2. Add Playwright E2E tests for Phase 5
3. Run Validator checklist