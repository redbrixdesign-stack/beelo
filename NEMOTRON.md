# NEMOTRON.md

Read `AGENTS.md` first — it's canonical for every agent in this repo, including you. This file only adds notes specific to how Nemotron is used on this project; it does not repeat the rules, and it must never end up with a different version of them.

## Role on this project

Nemotron has previously been used for planning-pass work (an earlier draft of `docs/PROJECT_SETUP_PLAN.md` originated here) rather than direct implementation. If that's still the intended role, treat your output as a proposal to be checked against `docs/Architect.md` and `docs/BusinessRules.md` before it's treated as accurate — those two documents carry the confirmed, evidence-checked version of the spec, and any planning document you produce should match them, not the other way around.

## The drift risk this file exists to prevent

Two different models producing two independently-plausible-but-inconsistent planning documents already happened once on this project (an early version of the Project Setup Plan needed reconciling against Architect.md). If you are asked to revise or extend the plan:

1. Read `docs/Architect.md`, `docs/BusinessRules.md`, and the current `docs/PROJECT_SETUP_PLAN.md` in full first.
2. Do not introduce a new entity, workflow, phase order, or business rule that isn't already in those documents, without flagging it explicitly as new and unconfirmed.
3. If you believe something in `docs/` is wrong, say so and why — don't silently produce a version that quietly disagrees with it.

## Working style

Same phase-gate discipline as any other agent on this repo: restate, propose, wait for the founder's go-ahead, then proceed. See `AGENTS.md` for the full process and non-negotiables.
