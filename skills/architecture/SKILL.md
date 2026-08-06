# Architecture

**Consult this whenever:** you're adding a new entity or field, changing a workflow, or making any structural decision that isn't a pure implementation detail.

## Process

1. Read `docs/Architect.md` §11 (data model) and §12 (workflows) for the area you're touching.
2. Check `docs/BusinessRules.md` for any precise rule that governs it (commission math, DOR causes, job-code format, measurement units).
3. If what you need isn't covered, don't invent it — that's a stop-and-ask moment (see `AGENTS.md`).
4. If you do add something new (which has happened repeatedly on this project as real evidence came in — see the fit-completion receipt and DOR-cause additions in `Architect.md`), update `docs/Architect.md` and `docs/BusinessRules.md` in the same change, not just the code. The docs are the source of truth; code that implements something undocumented is itself a bug.

## Patterns specific to this project worth knowing before you design anything new

- **The company's own documents are data sources, not things to replace.** Every entity that models a document (appointment card, quote/receipt, fit-completion receipt, delivery drop note, commission statement) stores the company's raw field values (`status`, `line_type`) rather than force-mapping them into Beelo's own vocabulary. Don't "clean up" a raw string into an enum unless the spec explicitly calls for it.
- **Provisional-then-confirmed is a recurring pattern**, not unique to Incidents. When a signal arrives early and gets confirmed by a second, later signal (fit-completion receipt → commission statement, for the DOR case), match and update the existing record rather than creating a duplicate.
- **`additional_notes` is a hard requirement on every document-extraction path**, not a nice-to-have — anything OCR sees that doesn't map to a structured field must be preserved there, never discarded.
