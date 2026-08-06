# Testing standards

For guidance on *what* to prioritise testing, see `skills/testing/SKILL.md`. This document covers the *how* — tooling and conventions.

## Tooling

- **Vitest** for unit and integration tests.
- **React Testing Library** for component tests — test behaviour (what the user sees/does), not implementation detail.
- **Playwright** for end-to-end tests — **added in Phase 4** (including offline flow scenario). Phase 1–3 rely on Vitest + React Testing Library + manual airplane-mode verification.

## Conventions

- Test files live alongside the code they test, named `*.test.ts` / `*.test.tsx`.
- Business-rule tests (commission math, DOR tiers, schedule-risk computation) should reference the specific rule in `docs/BusinessRules.md` they're testing, either in the test name or a comment, so a future change to the rule surfaces as a clearly-labelled test failure rather than a mysterious one.
- Mock the Supabase client at the data-layer boundary (see `standards/react.md` — components shouldn't call Supabase directly, so this boundary should already exist and be easy to mock).
- **Phase 4+**: At least one Playwright test should simulate the full offline flow: go offline, capture something core (a voice note or a visit), confirm it's saved locally with a visible pending state, go back online, confirm it syncs without further user action. This is the single most important end-to-end test on the project, since offline-first is a non-negotiable in `AGENTS.md`.

## What doesn't need heavy coverage yet

Visual/styling details, copy text, and anything not yet stable (features still being validated against real field use) — don't over-invest in tests for things likely to change shape as more real evidence comes in, per the pattern established throughout `docs/Architect.md`'s correction log.