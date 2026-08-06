# Prompt: review completed work

Use this to have an agent check its own or another agent's finished work before it's treated as done — good for catching phase-boundary drift or a missed non-negotiable before it compounds.

```
Review the code for [feature/phase] against:
- docs/Architect.md and docs/BusinessRules.md — does it match the spec,
  including any business rule it touches (commission math, DOR logic,
  measurement units, job_code format)?
- AGENTS.md non-negotiables — check each one explicitly, don't just assert
  compliance.
- standards/coding.md, standards/react.md, standards/security.md,
  standards/testing.md, as relevant to what changed.

For anything that doesn't match, tell me plainly what's wrong and why it
matters, rather than just listing files touched.

Then produce a handoff using templates/PR.md, including a manual test
checklist of 3 items or fewer, each doable in a couple of minutes.
```
