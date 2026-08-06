# Testing

**Consult this whenever:** deciding what needs a test before moving on, as distinct from `standards/testing.md` which covers the actual tooling conventions.

## Priority order for a solo, resource-constrained project

Not everything needs the same level of test coverage. Given limited time, prioritise in this order:

1. **Anything involving money or a penalty calculation** — commission math, DOR penalty tiers, the `counts_toward_dor` rule, mileage claim calculation. These are exactly the places a silent bug does real financial harm, and they're also exactly the places `docs/BusinessRules.md` gives you a precise, testable rule to write the test against directly.
2. **Input validation for money/percentage/measurement fields.** The known AdvisorOS bug (an unvalidated discount percentage silently producing a £0.00 sale total) is the canonical example of what a missing test here costs.
3. **Matching logic** — job_code matching across document types, screenshot-proximity matching for voice notes. Wrong matches corrupt data across multiple records, not just one.
4. **Offline/sync behaviour** — see `skills/offline/SKILL.md` for what "done" means; write the airplane-mode test as an actual automated test where feasible, not just a manual step.
5. **UI polish, styling, copy** — lowest priority for automated testing on this project. Manual review during the phase handoff is sufficient.

## What a good test for this project looks like

Prefer tests written directly against a rule in `docs/BusinessRules.md`, with the rule quoted or referenced in the test name/comment, so a future change to the business rule is caught by a failing test rather than requiring someone to remember the rule exists.
