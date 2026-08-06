# Beelo

An offline-first, voice-first PWA giving a solo, commission-based home-visit sales advisor (Hillarys-style blinds) a personal memory and pay-protection layer — built for someone working one-handed, in the field, inside a company-owned booking and commission system.

## Start here

If you're an AI agent working in this repo: read **`AGENTS.md`** first. It's canonical for every agent, human-written instruction, and tool-specific file in this repo.

If you're a person: `docs/Architect.md` is the full story — why this exists, who it's for, the complete data model, and the phased build plan. `docs/PROJECT_SETUP_PLAN.md` is the implementation companion. `docs/BusinessRules.md` is the dense, precise reference for anything involving money, penalties, or matching logic. `docs/Glossary.md` explains any term you're unsure of.

## Repo structure

```
beelo/
  README.md              — you are here
  AGENTS.md               — canonical rules for any AI agent working here
  CLAUDE.md                — Claude Code specific notes, defers to AGENTS.md
  NEMOTRON.md               — Nemotron specific notes, defers to AGENTS.md
  skills/                   — when/how to think about a given area
    architecture/            — new entities, workflows, structural decisions
    offline/                 — capture, sync, offline behaviour
    supabase/                — schema, RLS, Auth, Storage, Edge Functions
    ocr/                     — document extraction and matching
    review/                  — the phase-gate handoff process
    testing/                 — what to prioritise testing, and why
  standards/                — concrete technical conventions
    coding.md
    react.md
    security.md
    testing.md
  templates/                — structured formats for recurring work
    Feature.md
    ADR.md
    Bug.md
    PR.md
  prompts/                  — reusable prompts for common agent tasks
    implement-feature.md
    review-feature.md
    debug.md
  docs/                      — the actual spec, source of truth
    Architect.md
    PROJECT_SETUP_PLAN.md
    BusinessRules.md
    Glossary.md
```

## Why this structure exists

This project is built by a solo, non-technical founder, in short sessions between field jobs, using more than one AI coding tool. Two things follow from that, and they're why this repo looks the way it does rather than like a typical starter template:

1. **The spec has to be the single source of truth, not a chat transcript.** Everything the founder and any agent have worked out — including several corrections made after real evidence contradicted an earlier guess — lives in `docs/`, not in someone's memory of a conversation. `AGENTS.md` exists specifically to stop two different tools from quietly drifting into two different understandings of the same project.
2. **Review has to work for someone who isn't reading code.** `skills/review/SKILL.md` and `templates/PR.md` exist to force every handoff into a shape — plain-language summary, named judgment calls, a short manual test checklist — that can actually be verified by the person actually building this, on a phone, between jobs.

If a rule in `docs/` and something in `skills/` or `standards/` ever disagree, `docs/` wins — everything else exists to help apply it correctly, not to compete with it.
