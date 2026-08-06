# CLAUDE.md

Read `AGENTS.md` first — it's canonical for every agent in this repo, including you. This file only adds Claude Code-specific notes; it does not repeat the rules.

## Project in one line

Beelo: an offline-first, voice-first PWA giving a solo, commission-based home-visit sales advisor (Hillarys-style blinds) a personal memory and pay-protection layer, built to be used one-handed in the field.

## Stack

React 18 + TypeScript + Vite + Workbox (PWA) + Dexie.js (IndexedDB) + Supabase (Postgres, Auth, Storage, Edge Functions) + MapLibre GL JS + Claude API. Full detail in `docs/PROJECT_SETUP_PLAN.md`.

## Commands

Fill these in as the project scaffold is created in Phase 1 — placeholders below, update once real:

```
npm run dev        # local dev server
npm run build       # production build
npm run test        # Vitest unit/integration tests
npm run test:e2e    # Playwright
npm run lint         # lint
```

## Working style for this repo

- Follow the phase-gate process in `AGENTS.md` exactly — restate, propose, wait, build, review. Do not batch multiple phases into one session even if it seems more efficient; the founder's review bandwidth, not build speed, is the actual constraint on this project.
- The founder is not a developer. Summaries after each phase should be plain language, not a code walkthrough. Manual test steps should be things doable on a phone in a couple of minutes.
- When you use a template from `templates/` (Feature, ADR, Bug, PR), fill it out for real — it's the artifact the founder and any other agent will read later, not busywork.
- If you're about to make a judgment call not covered by `docs/`, write it down somewhere in `docs/` or as an ADR before proceeding, not just in your own response — see "Multi-agent consistency" in `AGENTS.md`.
