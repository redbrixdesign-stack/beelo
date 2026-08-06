# Beelo — Glossary

## Domain terms

**Advisor** — the solo user of Beelo; a commission-based home-visit sales advisor working inside a franchisor's (e.g. Hillarys') own booking and commission system.

**DOR (Defective Order)** — a company-raised record of something wrong with a job: a mismeasurement, wrong colour, wrong product, transit damage, theft, or a post-installation warranty failure. Only advisor-caused DORs (`cause: fitter_error`) carry a financial penalty — see `docs/BusinessRules.md`.

**job_code** — the short, primary identifier for a job (e.g. `H342`, `Q267`, `H301A`), format one letter + three digits + optional letter suffix. Appears across every document type for that job and is the main cross-document matching key. Distinct from the longer `order_number`, which only appears at fit stage.

**customer_number** — the company-issued identifier for a customer, durable across every appointment type (sales, survey, fit, service call) for that person.

**Employment model** — `company_advisor` (works inside a franchisor's commission system — the primary, validated persona) vs `independent` (fully self-employed, bears the full sale value of any mistake, no company cushion).

**Lead** — a person with a landed appointment, before a full Customer/Visit record exists. Tracked separately because the window to make first contact is short and time-sensitive.

**Survey** — a company-assigned visit to double-check measurements/order on a job the advisor didn't originally sell. Unpaid on its own; the eventual fit pays commission at a reduced rate to reflect that the advisor didn't make the sale.

**Service call** — a company-assigned visit for a minor fix or a second opinion, often triggered by a warranty issue. Pays a flat £20 regardless of outcome. The advisor may be authorised to raise a DOR themselves on the spot if the issue is unrepairable.

**Fit-completion receipt** — a document generated on the day of fitting, listing every blind on the job with a fitted/replacement status per line, distinct from the earlier quote/sale receipt (which shows pricing, not fit status).

## Technical terms

**RLS (Row Level Security)** — Postgres/Supabase policy that restricts every row to its owning `advisor_id`, enforced at the database level so a bug in application code can't leak one advisor's data to another.

**Edge Function** — server-side code running on Supabase's infrastructure, used for anything requiring a secret (the Claude API key) or anything that shouldn't run on the client.

**Dexie / IndexedDB** — the local, in-browser database that is the actual source of truth for offline-first capture. Data is written here first, always, then synced to Supabase when online.

**Sync queue** — a local (Dexie-only, never synced itself) table tracking pending create/update/delete operations waiting to reach Supabase, with retry and conflict state.

**source_env** — a field present on every record (`demo` | `qa` | `live`), always visible in the UI, so it's never ambiguous which environment a piece of data belongs to.

**Provenance fields** (`model_version`, `prompt_version`, `confidence`) — present on every AI-affected record, so any extraction or draft can be traced back to exactly what produced it.

**QuoteLineItem** — a per-blind pricing record extracted from a quote/sale receipt (room, position, colour, width, quantity, price).

**CommissionLineItem** — a single row extracted from the weekly commission statement; doubles as both an earnings record and, when its `line_type` indicates a defect, the trigger for creating or confirming an Incident.

**FitLineItem** — a per-blind fitted/replacement status extracted from a fit-completion receipt; the earliest possible signal of an Incident, ahead of the weekly commission statement.

**Provisional Incident** — an Incident created from a FitLineItem before the commission statement has confirmed the financial details. Gets confirmed and filled in, not duplicated, when the matching CommissionLineItem arrives.
