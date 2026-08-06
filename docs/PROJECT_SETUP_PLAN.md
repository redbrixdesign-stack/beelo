# Beelo — Project Setup Plan

**Version:** 3.1
**Status:** Pilot-ready foundation, aligned with `docs/Architect.md`
**Audience:** Founder, developers, technical partners, pilot reviewers

This document is the implementation companion to `docs/Architect.md`. Architect.md defines *what* Beelo is and *why*; this document defines *how* it gets built — stack, schema, phased sequence, and engineering deliverables. Where the two ever appear to disagree, `docs/Architect.md` wins, and this document should be corrected to match it.

---

## 1. Project Overview

**Product:** Beelo — offline-capable AI operational memory layer for commission-based home-visit sales advisors working inside a franchisor's booking/commission system (beachhead: Hillarys-style blinds advisors).

**Goal:** Deliver a working MVP PWA that a solo advisor can use hands-free on-site to capture job context via voice/photo, resurface what matters at the moment it matters, draft communications for approval, track mileage/earnings, catch pay discrepancies (DOR), and avoid schedule mistakes — without a desk, signal, or second person.

**Pilot criteria:** 5–10 commission-based advisors using the app on live jobs for 4–6 weeks, measuring admin-time reduction, follow-up completion, schedule-risk warnings triggered, DOR detection accuracy, and mileage-logging compliance.

**Non-goals:** CRM, accounting, team features, product-spec storage, automated messaging, tax filing, navigation replacement, replacing the franchisor's booking system.

---

## 2. Technical Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | React 18 + TypeScript + Vite | Fast dev, small bundle, PWA-ready |
| PWA / Offline | Workbox (Vite PWA plugin) + Dexie.js (IndexedDB) | Service worker for shell/assets; Dexie for structured offline data, reactive queries, sync queue |
| Backend / Database | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | Low ops, RLS for single-advisor isolation |
| AI orchestration | Claude API via Supabase Edge Functions | Server-side only; OCR, transcription, drafting, memory inference; no client keys |
| Maps / Routing | MapLibre GL JS (display) + a real routing engine (OSRM or a commercial directions API) for clustering/savings | MapLibre alone only renders — it does not compute routes |
| File storage | Supabase Storage (signed URLs) | Encrypted at rest |
| Auth | Supabase Auth (email/password + magic link) | Simple, secure |
| Testing | Vitest + React Testing Library + Playwright (E2E from Phase 4) | Unit, integration, browser |
| CI/CD | GitHub Actions + Netlify | Preview + production deploys |
| Hosting | Netlify | PWA-ready |

**Key principle:** voice-first, single-control interaction model — no core action requires two free hands. Offline shell via Workbox; structured data via Dexie/IndexedDB, which is the local source of truth. All AI runs server-side in Edge Functions.

---

## 3. High-Level Data Flow

1. Core capture (voice, photo, manual entry) → Dexie immediately, offline.
2. Voice/photos uploaded to Storage in the background → Edge Function queues AI processing.
3. AI extraction (OCR, transcription) → structured fields + `additional_notes` → back to client → Dexie.
4. Downtime batch review: schedule gap + capture backlog → prompts a review session.
5. Sync queue batches local changes → pushes to Supabase when online.
6. Edge Functions handle drafting, DOR detection, schedule-risk computation, commission cross-check.
7. User reviews and approves → local DB updated → syncs up.

---

## 4. Data Model

The full entity list lives in `docs/Architect.md` §11 — do not duplicate it here as a second source of truth. This section only notes implementation conventions:

- Every entity is scoped to a single `advisor_id`, enforced by RLS.
- `source_env` (`demo` | `qa` | `live`) is present on every record and always visible in the UI.
- **AI provenance fields** (`model_version`, `prompt_version`, `confidence`, source document/event IDs) are added in **Phase 3** when AI extraction begins — not in Phase 1–2 schema.
- A `sync_queue` table (Dexie-only, not synced to Supabase) tracks pending local operations: `entity_type`, `entity_id`, `operation`, `payload`, `status`, `retry_count`, `last_error`.

---

## 5. Phased Build Plan

This mirrors `docs/Architect.md` §13, with week-level granularity for solo, between-breaks development pace. Do not start a phase until the previous one is built and manually tested — see `skills/review/SKILL.md` for the review process.

**Phase 1 — Foundation (Weeks 1–2).** Auth, advisor profile, RLS-isolated schema for all entities, offline-first storage and sync queue, Customer/Visit CRUD, the validated outcome taxonomy, mobile-first navigation. **No AI, no provenance fields.**

**Phase 2 — Close the capture loop (Weeks 3–4).** Lead + CallAttempt + VoiceNote entities, voice capture UI (platform-assistant shortcut integration), transcription pipeline, downtime-gap detection, batch review UI, screenshot-proximity and manual matching.

**Phase 3 — Protect the pay (Weeks 5–6).** QuoteLineItem and CommissionLineItem OCR extraction, FitLineItem extraction from fit-completion receipts, auto-Incident creation (both the provisional fit-day trigger and the confirming commission-statement trigger), commission-rate cross-checking, the full Incident cause/type taxonomy per `docs/BusinessRules.md`. **AI provenance fields added to schema here.**

**Phase 4 — Protect the schedule (Week 7).** Blind-count-driven schedule-risk computation, ScheduleSuggestion entity and UI, integration into visit creation, booking-confirmation drafting. **Playwright E2E tests added here (including offline flow).**

**Phase 5 — Round it out (Weeks 8–9).** Delivery-drop-note multi-fan-out OCR, expense capture, DOR rolling-rate prediction display, export/backup, settings (HMRC rate config), onboarding, pilot metrics instrumentation.

**Week 10+ — Pilot launch.** Recruit 5–10 advisors, distribute via PWA install, weekly check-ins.

---

## 6. AI Integration Points

| # | Integration | Trigger |
|---|---|---|
| 1 | OCR: appointment card, quote/receipt, fit-completion receipt, delivery drop note, commission statement | Document upload |
| 2 | Voice transcription + field extraction | VoiceNote recorded, once online |
| 3 | Schedule-risk computation | Deterministic, client-side, once blind count is known |
| 4 | Draft generation: follow-ups, booking confirmations | Visit created/completed, lead follow-up due |
| 5 | DOR/Incident detection from commission-statement lines and fit-completion receipts | Document processed |
| 6 | Commission-rate cross-check | Deterministic, server-side, on CommissionLineItem creation |
| 7 | Measurement validation | Deterministic, client-side |

**Rules governing every AI output:** every output is a proposal, draft, or provisional record — never a completed action. No hidden side effects. No output is claimed as complete while offline. Every AI-affected record carries model/prompt version (from Phase 3). The user confirms or edits before anything external happens.

---

## 7. Security and Privacy

RLS on every table (`advisor_id = auth.uid()`), TLS in transit, encryption at rest, Claude API key only in Edge Function environment variables, signed URLs for all evidence access, an audit trail on every record, **single Supabase project with `source_env` flag for environment separation** (demo/qa/live), explicit advisor `consent_status`, no PII in analytics. DPIA is a pilot-launch checklist item, not a development standard.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| OCR accuracy drifts as company document layouts change | `additional_notes` fallback; manual review queue; treat every document-type mapping as versioned, not fixed |
| Hands-free trigger feasibility varies by platform | Platform assistant shortcuts (iOS Shortcuts / Android App Actions) as the realistic path; tap-to-record as fallback |
| Sync conflicts from offline edits | Last-write-wins plus a visible diff for key entities |
| Model/inference cost creep | Cheaper model for classification/extraction, stronger model only for drafting |
| Silent validation or geocoding failure | Non-negotiable from Phase 1 onward — see `standards/security.md` and `standards/coding.md` |

---

## 9. Success Criteria

5+ advisors piloting, ≥10 jobs each. Target outcomes: admin time down materially, follow-up completion rate up, schedule-risk warnings firing at a meaningful rate per advisor per week, high DOR-detection accuracy against what advisors independently know happened, high mileage-logging compliance.