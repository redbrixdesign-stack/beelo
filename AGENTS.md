# AGENTS.md — instructions for any AI agent working in this repository

This file applies to every agent working in this repo — Claude Code, Nemotron, or anything else. Tool-specific files (`CLAUDE.md`, `NEMOTRON.md`) exist only to point back here and note any tool-specific quirks; they must never contain a second copy of these rules, because two copies drift.

## Source of truth

- `docs/Architect.md` — what Beelo is, why, the full data model, and the phased build plan. This is the primary spec.
- `docs/PROJECT_SETUP_PLAN.md` — the implementation companion: stack, schema conventions, week-level sequencing.
- `docs/BusinessRules.md` — precise, testable rules (commission math, DOR logic, measurement units, job-code format). Check this before implementing any logic involving money, penalties, or matching.
- `docs/Glossary.md` — term definitions, for when you're unsure what a word in the spec means.

If any of these documents appear to conflict, stop and flag it rather than picking one silently. If a decision is needed that none of them cover, stop and ask the founder — do not invent scope, entities, or workflows.

**This is a ground-up rebuild.** There is no prior codebase to migrate. An earlier no-code prototype (AdvisorOS) was used only to validate that the workflows work in real field use — its behaviour is documented in Architect.md as evidence, its code is not being reused.

## The phase-gate process

Work one phase at a time, in the order in `docs/PROJECT_SETUP_PLAN.md` §5. Do not start a phase until the previous one is built and manually tested by the founder. Before writing code for a phase:

1. Restate what the phase covers, in plain language, so the founder can confirm you've read the spec correctly.
2. Propose the file/folder structure and any new dependencies for that phase only.
3. Propose the schema/migration and RLS changes for that phase only, if any.
4. Wait for explicit go-ahead before generating code.

**After a phase is built, before handoff to founder:**
5. **Run Validator agent** — it must PASS all checks:
   - Automated: lint, typecheck, unit tests
   - Non-negotiables: all 9 explicitly verified with evidence
   - PR.md completeness: all sections filled
6. **Only if Validator PASS** → produce PR.md handoff for founder review

After a phase, provide: a plain-language summary of what was built and where, any judgment calls made and why, and a short manual test checklist (aim for 3 items or fewer, each completable in a couple of minutes) — the founder is reviewing this between jobs, on a phone, not reading a diff. See `skills/review/SKILL.md` for the full review pattern.

## Non-negotiables

These apply in every phase, regardless of what's being built:

- **Voice-first, single-control.** No core action can require two free hands.
- **Offline-first.** Core capture (voice, photo, manual entry) must work with no network. Dexie/IndexedDB is the local source of truth.
- **AI runs server-side only**, in Supabase Edge Functions. The client never holds an API key.
- **Every AI output is a draft or proposal.** Nothing sends, deletes, or acts externally without explicit user confirmation. No AI output is ever claimed complete while offline — it's honestly queued as pending.
- **RLS on every table**, keyed to `advisor_id`. Single-tenant-per-advisor from the start, not retrofitted.
- **Strict validation on anything involving money or percentages.** Reject invalid input with a visible error; never silently produce a wrong result.
- **Geocoding and other external lookups fail visibly**, with a retry path, never silently.
- **Measurement units are centimetres.** HMRC mileage rate is a config value, never hardcoded.
- **Solo-user only.** No team features, no multi-user assumptions, ever, in any phase.

## Where to look before doing anything

- A new entity, workflow, or structural decision → `skills/architecture/SKILL.md`, then `docs/Architect.md` §11–12.
- Anything offline/sync-related → `skills/offline/SKILL.md`.
- Anything touching Supabase (schema, RLS, Edge Functions) → `skills/supabase/SKILL.md`.
- Anything involving document capture or extraction → `skills/ocr/SKILL.md`.
- Reviewing a completed phase or feature → `skills/review/SKILL.md`.
- Writing or deciding what to test → `skills/testing/SKILL.md`.
- Coding conventions → `standards/coding.md`, `standards/react.md`, `standards/security.md`, `standards/testing.md`.
- Starting a new piece of work → the matching template in `templates/`.

## Multi-agent consistency

More than one AI tool works on this repo. If you make a decision that isn't already written down in `docs/`, write it down (in the relevant doc, or as an ADR via `templates/ADR.md`) rather than leaving it only in a chat transcript — the next agent, or the next session of you, has no memory of this conversation and only has these files.
