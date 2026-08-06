# Review

**Consult this whenever:** a phase or feature is finished and needs to be handed back to the founder, or when reviewing another agent's completed work.

## Who's reviewing, and what that means

The founder is not a developer, is not reading diffs, and is reviewing this between jobs — often on a phone, in short windows. A review process built for a technical co-founder is the wrong process here. Optimise for "can this be confirmed correct in under five minutes without reading code," not for completeness of technical detail.

## The handoff shape that's worked well on this project

1. **What was built, in plain English**, ideally as a short table: feature → where it lives → what it replaces or adds. Not a code walkthrough.
2. **Judgment calls made and why** — anything decided that wasn't explicitly in the spec, with the alternative considered and why it was rejected. This is what lets the founder (or a different agent later) catch a wrong turn early instead of it compounding across phases.
3. **A short manual test checklist — 3 items or fewer, each doable in a couple of minutes on a phone.** If a checklist item can't actually be tested yet (e.g. "not needed until a later phase"), don't include it just to hit a number — an uncheckable checklist item undermines trust in the rest of the list.
4. **Any blockers or open questions**, explicitly, rather than silently working around an ambiguity.

Use `templates/PR.md` to structure this consistently.

## Phase boundaries

Watch for scope creep across phase boundaries — it's happened on this project before (PWA shell and the full Dexie schema, which are Phase 1 items, got built during a "Phase 0" pass). It's not necessarily wrong to pull forward work that's genuinely needed to test something, but it must be named explicitly in the handoff, so the next phase's scope is understood to be smaller than the plan originally described, not silently redone.
