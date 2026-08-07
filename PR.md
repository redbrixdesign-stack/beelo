# Phase 2 — Close the Capture Loop — PR.md Handoff

## Summary

**What was built:** Lead + CallAttempt + VoiceNote entities with full RLS, voice capture UI (deep-link + manual), server-side transcription pipeline, downtime-gap detection, and batch review UI with three matching strategies (screenshot proximity, manual, name-hint).

**Where:** `supabase/migrations/20260807_phase2_entities.sql`, `supabase/functions/transcribe-voice-note/`, `src/features/leads/`, `src/features/voice/`, `src/features/downtime/`, `src/platform/`

**Phase:** 2 of 5 (Weeks 3–4)

---

## Entities & Schema

### New Tables (all with RLS from line 1)

| Table | Key Fields | RLS Policy |
|-------|------------|------------|
| `leads` | `id`, `advisor_id`, `name`, `phone`, `landed_at`, `status`, `contact_attempts_count`, `source`, `source_env` | `advisor_id = auth.uid()` |
| `call_attempts` | `id`, `lead_id`, `initiated_at`, `outcome`, `voice_note_id`, `source_env` | `lead_id IN (SELECT id FROM leads WHERE advisor_id = auth.uid())` |
| `voice_notes` | `id`, `advisor_id`, `audio_path`, `recorded_at`, `duration_seconds`, `trigger_method`, `status`, `transcript`, `extracted_*`, `linked_appointment_screenshot_document_id`, `matched_visit_id`, `matched_customer_id`, `match_method`, `lead_id`, `source_env` | `advisor_id = auth.uid()` |

### Dexie Schema (local-first)

All three tables mirrored in IndexedDB with `_sync_status` and `_last_synced_at` fields. Indexes match Supabase for query parity.

### Status Enums (enforced at DB + app)

- `Lead.status`: `new` → `call_attempted` → `connected`/`no_response` → `follow_up_due` → `converted_to_visit`/`lost`
- `CallAttempt.outcome`: `connected` | `no_answer` | `voicemail`
- `VoiceNote.status`: `recorded` → `transcribed` → `unmatched` → `matched` → `reviewed`
- `VoiceNote.trigger_method`: `manual_button` | `siri_shortcut` | `assistant_action`
- `VoiceNote.match_method`: `screenshot_proximity` | `manual_review` | `name_hint`

---

## Voice Capture

### Deep-Link Schema (ADR-001)
```
beelo://voice-capture?trigger={source}&lead_id={optional}&appointment_id={optional}&source_env={env}
```
- `trigger` maps directly to `VoiceNote.trigger_method`
- Opens PWA → starts recording immediately (no confirmation dialog)
- 5-minute max, stops on user tap or app backgrounded
- Audio saved locally → `audio_path` stored in Dexie

### Platform Integration
- **iOS**: Siri Shortcut "Open URL" with phrase "Hey Siri, log call"
- **Android**: App Action `actions.intent.START_RECORDING` with phrase "OK Google, note job on Beelo"
- **Fallback**: Prominent "Record Voice Note" button on home screen and Visit detail (`trigger_method: manual_button`)

### Offline Behaviour
- Recording works 100% offline — VoiceNote created in Dexie with `status: recorded`
- Audio uploads to Supabase Storage when online
- Transcription queued honestly — UI shows "queued for transcription" until complete

---

## Transcription Pipeline

### Edge Function: `transcribe-voice-note`
- **Trigger**: VoiceNote uploaded to Storage (via sync queue)
- **Input**: `voice_note_id`, `audio_path` (Storage)
- **Output**: `transcript`, `extracted_blind_count`, `extracted_parking_notes`, `extracted_access_notes`, `extracted_name_spoken`, `confidence`
- **Updates**: VoiceNote with extracted fields, `status: transcribed`
- **AI**: Claude API (server-side only, no client keys)
- **Provenance**: NOT added in Phase 2 (added in Phase 3 per spec)

---

## Downtime-Gap Detection

### `useDowntimeDetector` Hook
- Monitors `Visit` schedule for gaps ≥ 30 minutes
- Checks for backlog: `VoiceNote` count where `status IN ('recorded','transcribed','unmatched')` > 0
- Prompts non-intrusive banner: "You have 15 min before next job — review 3 voice notes?"
- Only prompts when online (matching requires network for screenshot proximity)

---

## Batch Review UI (`BatchReviewScreen`)

### Matching Strategies
1. **Screenshot Proximity**: Shows appointment card screenshots (`Document.type = appointment_card`) captured near `VoiceNote.recorded_at` (±5 min). User taps to match.
2. **Manual Review**: Lists unmatched `Visit` and `Customer` records. User picks.
3. **Name Hint**: Compares `VoiceNote.extracted_name_spoken` vs `Customer.display_name` (fuzzy). Shows top 3 candidates.

### On Match
- Updates `VoiceNote`: `matched_visit_id`, `matched_customer_id`, `match_method`, `status: matched`
- If `VoiceNote.lead_id` set → `Lead.status = converted_to_visit`, `Lead.contact_attempts_count++`
- Creates `CallAttempt` with `outcome: connected` and `voice_note_id` link

---

## Sync Queue

All three entity types (`leads`, `call_attempts`, `voice_notes`) enqueue `create`/`update`/`delete` operations. Background sync processes queue when online. Conflicts: last-write-wins for non-financial; VoiceNotes have no financial fields in Phase 2.

---

## Judgment Calls Made

| Decision | Rationale |
|----------|-----------|
| `VoiceNote.duration_seconds` max 300 | ADR-001 specifies 5-min max; prevents runaway recordings |
| `trigger_method` enum includes `assistant_action` (not `google_assistant`) | Matches Architect.md §11 enum exactly; ADR-001 uses `google_assistant` in URL but `assistant_action` in DB |
| Downtime threshold = 30 min | Matches "natural downtime between jobs" from Architect.md §12; configurable later if needed |
| Screenshot proximity window = ±5 min | Heuristic — appointment card typically captured right before/after call |
| No provenance fields on VoiceNote | Explicitly deferred to Phase 3 per PROJECT_SETUP_PLAN.md §5 and supabase/SKILL.md |
| `source_env` default = `live` | Single Supabase project with env flag; matches Architect.md §17 |

---

## Manual Test Checklist (3 items, <5 min each)

1. **Offline voice capture → online transcription**
   - Enable airplane mode
   - Tap "Record Voice Note" → speak for 10s → tap stop
   - Verify VoiceNote appears in list with `status: recorded`, "queued for transcription" badge
   - Disable airplane mode → wait 10s → verify `status: transcribed`, transcript + extracted fields populated

2. **Deep-link voice capture (simulated)**
   - Open `beelo://voice-capture?trigger=siri_shortcut&source_env=live` in Safari/Chrome
   - Verify PWA opens directly to recording screen, starts recording immediately
   - Stop recording → verify VoiceNote created with `trigger_method: siri_shortcut`

3. **Batch review with screenshot proximity match**
   - Create a Visit with future `date_time`
   - Capture appointment card screenshot (Document) for that Visit
   - Record VoiceNote (any method) within 5 min of screenshot
   - Open BatchReviewScreen (or wait for downtime prompt)
   - Verify screenshot appears as match candidate → tap to match
   - Verify VoiceNote `status: matched`, `match_method: screenshot_proximity`, `matched_visit_id` set

---

## Validator Checklist (must PASS before handoff)

- [ ] Lint: `npm run lint` — 0 errors
- [ ] Typecheck: `npm run typecheck` — 0 errors
- [ ] Unit tests: `npm run test` — all pass (target: ≥80% coverage on new hooks/components)
- [ ] RLS verified: 3 tables × 4 policies each = 12 policies, all `advisor_id` scoped
- [ ] Migration reversible: `supabase db reset` applies cleanly
- [ ] Non-negotiables (9):
  1. RLS on every table from line 1
  2. Job-code regex untouched (Phase 2 doesn't modify)
  3. Measurement units untouched (cm)
  4. HMRC rate untouched (config on Advisor)
  5. Single Supabase project + `source_env` on all 3 tables
  6. Provenance fields NOT added (Phase 3)
  7. Voice capture uses ADR-001 deep-link schema
  8. Offline-first: Dexie local source of truth, honest queued states
  9. Solo-user only, no team features
- [ ] PR.md complete: all sections filled above

---

## Follow-up Items (Phase 3+)

- Add AI provenance fields (`model_version`, `prompt_version`, `confidence`) to `voice_notes` in Phase 3 migration
- Learn `full_job_minutes_per_blind` per advisor from real Visit durations (Phase 4)
- Delivery-drop-note multi-fan-out OCR (Phase 5)
- DOR rolling-rate prediction display (Phase 5)

---

## Files Changed (summary)

```
supabase/
  migrations/
    20260807_phase2_entities.sql
  functions/
    transcribe-voice-note/
      index.ts
      deno.json
src/
  db/
    schema.ts
    syncQueue.ts
  features/
    leads/
      components/LeadList.tsx
      components/LeadDetail.tsx
      components/LeadForm.tsx
      hooks/useLeads.ts
      hooks/useLeadActions.ts
    voice/
      components/VoiceCaptureScreen.tsx
      components/VoiceNoteCard.tsx
      components/BatchReviewScreen.tsx
      components/ScreenshotMatcher.tsx
      components/ManualMatcher.tsx
      components/NameHintMatcher.tsx
      hooks/useVoiceCapture.ts
      hooks/useTranscription.ts
      hooks/useBatchReview.ts
      utils/deepLinkHandler.ts
      utils/audioRecorder.ts
    downtime/
      hooks/useDowntimeDetector.ts
      components/DowntimePrompt.tsx
  platform/
    ios/SiriShortcutGuide.tsx
    android/AppActionsGuide.tsx
  types/
    lead.ts
    voiceNote.ts
    callAttempt.ts
```