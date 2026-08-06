# Offline-first

**Consult this whenever:** you're building anything involving capture, sync, or a network call.

## Rules

- Dexie/IndexedDB is the **local source of truth**. Anything captured (voice, photo, manual entry) writes here first, immediately, before any network attempt. The UI never blocks on a network call to show that a capture succeeded.
- Every write that needs to reach Supabase goes through the sync queue, not a direct call from the UI. The queue is inspectable — the founder should always be able to see what's pending and why.
- **Never claim an AI output is complete while offline.** If transcription, OCR, or drafting hasn't run yet because there's no connection, the UI must say so honestly (e.g. "queued — will process when back online"), not show a placeholder that looks finished.
- Geocoding and any other external lookup must degrade visibly: a clear failure state, a retry option, and a manual-entry fallback. Never fail silently (AdvisorOS shipped this bug on its own base address — see `docs/Architect.md` §6, "known issues").
- Sync conflicts: default to last-write-wins for low-stakes fields, but surface a visible diff for anything financial (commission, DOR penalty amounts) rather than silently picking a winner.

## What "done" looks like for an offline feature

A feature isn't done until you can: turn on airplane mode, perform the core capture action, see it saved locally with an honest "pending sync" state, turn airplane mode back off, and watch it sync without the user having to do anything else.
