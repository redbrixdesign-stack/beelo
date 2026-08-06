# React standards

## The constraint that shapes everything here

The user is frequently one-handed — a drill, a blind, or sample bags occupying the other hand or shoulder. Every core-flow component should be reviewed against that constraint specifically, not just general mobile-friendliness.

- Large, unambiguous tap targets. No core action should require precision tapping.
- No core action should require a multi-step form to be filled out before anything is saved — capture first (voice, photo, a single tap), structure later. See `skills/offline/SKILL.md`.
- Voice/photo capture controls should be reachable without hunting through a menu — a persistent, prominent entry point, not buried in settings.
- Avoid confirmation dialogs on capture actions. Confirmation belongs at review/matching time (during downtime batch review), not at the moment of capture, which is often happening while driving or on a ladder.

## Structure

- Functional components with hooks. No class components.
- Data access goes through a thin data layer wrapping Dexie (for local reads/writes) and the sync queue (for anything that needs to reach Supabase) — components should not talk to Dexie or Supabase directly.
- Keep components that render a specific entity (VisitCard, IncidentCard, etc.) colocated with light, entity-specific logic; keep business logic (commission calculation, schedule-risk computation) in `standards/coding.md`-style shared functions, not inside the component.
- Loading and offline states are not edge cases to handle later — every data-dependent component should have an explicit loading state and an explicit "this is pending sync" state from the start, matching the offline-first non-negotiable in `AGENTS.md`.
