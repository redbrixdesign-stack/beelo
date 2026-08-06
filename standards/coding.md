# Coding standards

- TypeScript strict mode. No `any` — if a type is genuinely unknown (e.g. raw OCR output before validation), use `unknown` and narrow it explicitly.
- Every field that can be shown to a company's raw string value (`Visit.status`, `CommissionLineItem.line_type`, etc.) is typed as `string`, not a hardcoded union — don't force-fit an external system's vocabulary into an enum Beelo doesn't control. See `skills/architecture/SKILL.md`.
- Validation for anything money- or percentage-shaped is centralised in shared validation utilities, not re-implemented per form. Reject invalid input with a visible, specific error message — never silently clamp, coerce, or ignore it.
- Every function that calls an external service (geocoding, Supabase, an Edge Function) has an explicit error path that surfaces to the UI — no silent `catch` blocks that swallow an error without a visible consequence.
- Prefer small, named functions for business logic (commission calculation, DOR tier lookup, schedule-risk computation) over inlining it in a component — these are exactly the functions `skills/testing/SKILL.md` says need direct tests against `docs/BusinessRules.md`.
- Comment business-rule-driven code with a pointer to the rule, e.g. `// see docs/BusinessRules.md — only fitter_error counts toward DOR`, so a future change to the rule is easy to trace back to every place it's implemented.
