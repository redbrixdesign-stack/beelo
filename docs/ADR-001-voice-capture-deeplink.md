# ADR: Voice Capture Deep-Link Schema for Platform Assistant Integration

**Date:** 2026-08-06
**Status:** accepted

## Context

Phase 2 requires hands-free voice capture via platform assistants (Siri Shortcuts on iOS, Google Assistant App Actions on Android). The advisor must be able to trigger recording without touching the phone — e.g., "Hey Siri, log call" or "OK Google, note job."

We need a deterministic, platform-agnostic deep-link schema that:
- Launches the Beelo PWA directly into voice recording
- Passes metadata (trigger source, optional lead/appointment context)
- Works offline (recording starts immediately, transcription queues)
- Has a tap-to-record fallback in the app for when voice trigger fails

This must be defined before Phase 2 implementation so the voice capture UI and VoiceNote entity can handle the payload correctly.

## Decision

**Deep-link URL schema:**
```
beelo://voice-capture?trigger={source}&lead_id={optional}&appointment_id={optional}&source_env={env}
```

**Parameters:**
| Parameter | Required | Values | Description |
|---|---|---|---|
| `trigger` | Yes | `siri_shortcut`, `google_assistant`, `manual_button`, `assistant_action` | Maps directly to `VoiceNote.trigger_method` enum |
| `lead_id` | No | UUID | If a Lead exists, pre-associate the VoiceNote |
| `appointment_id` | No | UUID | If a Visit exists, pre-associate (e.g., on-site note) |
| `source_env` | No | `demo`, `qa`, `live` | Defaults to current app environment |

**Behaviour:**
1. App receives deep-link → opens PWA (or launches if not running)
2. Immediately starts audio recording (no confirmation dialog — per React standards, capture first, confirm later)
3. Creates `VoiceNote` record in Dexie with `status: recorded`, `trigger_method` from param, `lead_id`/`appointment_id` if provided
4. Recording stops on: user taps stop, 5-minute max, or app backgrounded
5. Audio saved to local filesystem → path stored in `audio_path`
6. When online: audio uploaded to Supabase Storage → Edge Function transcribes → `VoiceNote` updated with `transcript`, `extracted_*` fields, `status: transcribed`

**Platform-specific setup:**

*iOS (Siri Shortcuts):*
- Shortcut action: "Open URL" → `beelo://voice-capture?trigger=siri_shortcut&source_env=live`
- User assigns voice phrase: "Hey Siri, log call"
- Shortcut can pass `lead_id` if run from a Lead detail share sheet

*Android (App Actions / Google Assistant):*
- `actions.xml` declares `actions.intent.START_RECORDING` fulfillment with URL template
- User says: "OK Google, note job on Beelo"
- Assistant passes parameters via intent extras

**Fallback:** Prominent "Record Voice Note" button on home screen and Visit detail — taps create `VoiceNote` with `trigger_method: manual_button`.

## Alternatives considered

1. **Custom wake-word / always-listening** — Rejected: battery drain, OS permission hurdles, privacy concerns, not reliable on iOS.
2. **Push-to-talk via Bluetooth button** — Rejected: adds hardware dependency, not universal.
3. **In-app only (no deep-link)** — Rejected: fails the "one hand free, on a ladder" test — advisor can't unlock phone, find app, tap record.

## Consequences

- **Positive:** True hands-free capture works on both platforms with native assistant integration. Deep-link schema is simple, extensible, and works offline-first.
- **Negative:** Requires user to set up Siri Shortcut / App Action once (one-time config). Mitigated by in-app setup guide with one-tap shortcut installation.
- **Migration note:** `VoiceNote.trigger_method` enum in Architect.md §11 already includes `siri_shortcut`, `google_assistant` (as `assistant_action`), `manual_button` — no schema change needed.
- **Phase 2 dependency:** This ADR must be implemented before or alongside VoiceNote entity + transcription pipeline.