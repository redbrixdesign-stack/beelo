# Beelo — Business Rules

Precise, testable rules. This document exists because the narrative in `Architect.md` explains *why* a rule exists; this document states the rule itself, unambiguously, for whoever is implementing or testing it. If this document and `Architect.md` ever disagree, treat that as a bug in this document and fix it — `Architect.md` carries the reasoning and evidence trail.

Every rule below is either **confirmed** (stated directly by the advisor against real evidence) or **open** (a documented assumption or unresolved question — check `Architect.md` §19 before relying on it in code).

---

## Commission

- Commission period is **weekly**, not monthly. *(confirmed)*
- Commission = sale value, less a VAT/adjustment percentage, then the advisor's commission rate applied to the net figure. Default observed: 20% VAT/adjustment, 15.25% commission rate — both must be advisor-editable config, not hardcoded. *(confirmed against a real commission statement)*
- A `company_assigned` job (the advisor didn't make the original sale — e.g. a `survey` visit type) pays commission at **rate minus 2 percentage points**, not the full rate. *(confirmed)*
- A `survey` visit itself generates **no commission line** — it's unpaid reconnaissance work the company assigns; only the resulting fit is paid, at the reduced rate above. *(confirmed)*
- A `service_call` visit pays a flat **£20**, regardless of outcome, as its own commission-statement line (`line_type` containing "Service Call"). *(confirmed against a real statement)*

## DOR (Defective Order) penalties

- **Only `cause: fitter_error` opens the advisor to a financial penalty.** Every other cause — production fault, transit damage (either leg), theft, warranty malfunction, customer error — is Hillarys' responsibility and must not reduce the advisor's pay or count against their DOR%. `counts_toward_dor` defaults to `false` for every cause except `fitter_error`. *(confirmed explicitly)*
- The penalty is **flat per blind, independent of that blind's price**: £20/blind at the advisor's standard tier, £40/blind at the elevated tier. *(confirmed, corrected twice during spec review — earlier drafts wrongly modeled it as percentage-of-value and as per-incident rather than per-blind)*
- The tier (£20 vs £40) is driven by the advisor's **rolling DOR% for the current commission week**, not a monthly or all-time average. *(confirmed)*
- For a `company_advisor`, the flat penalty is their **entire** financial exposure — Hillarys remakes and refits the blind at its own cost. There is no additional `remake_cost` field for this branch. *(confirmed)*
- For an `independent` advisor (no company backing), there is no flat-rate cushion: they lose the **full sale value** of the affected blind, and — only if the client agrees — bear the cost of remake materials and their own unpaid labour to redo it. *(confirmed; this branch is modeled but not the primary validated persona)*
- A DOR does **not** require its own standalone receipt document in the normal case — it typically appears as a line on the weekly commission statement, with a plain-text reason (`Mismeasure`, `Wrong Colour`, `Wrong Order`, etc.), and that reason is the actual trigger for creating an Incident record. *(confirmed as the primary path; `dor_receipt` as a standalone document type is kept as an edge-case fallback only)*
- A **provisional** Incident can be created earlier than the commission statement, directly from a `fit_completion_receipt` on the day of fitting — any line marked `replacement` on that receipt is the earliest available signal. The commission-statement line later confirms it and fills in the financial fields; it should not create a second, duplicate Incident. Match on `job_code` (+ line reference where available). *(confirmed as a valuable pattern; matching-key precision is still open, see below)*

## Incident causes

Full `type` enum: `mismeasurement`, `wrong_colour`, `wrong_product`, `installation_damage`, `window_breakage`, `logistics_damage`, `theft`, `warranty_malfunction`, `other`.

Full `cause` enum: `fitter_error`, `customer_error`, `supplier_error` (production fault), `logistics_error` (damaged in transit — record which leg: `hillarys_to_advisor` or `advisor_to_customer`), `theft`, `product_defect` (post-installation warranty failure), `accidental`, `unknown`.

- A recurring, specifically named `fitter_error` pattern worth its own `cause_detail` value: `copied_wrong_room_measurement` — copying a previous room's measurement/product forward via the company software's shortcut and not updating it for the new room, typically caused by back-to-back bookings with no buffer. This is coachable and worth surfacing back to the advisor as a pattern, not just logged as a generic error. *(confirmed as a real, observed failure mode)*
- A `warranty_malfunction` can be discovered on a `service_call` visit **months or years** after the original fit — it is not the same visit, and the Incident record must link back to the original fit visit (`original_fit_visit_id`) separately from the visit where it was discovered (`visit_id`). *(confirmed)*
- On a service call, the advisor acts as Hillarys' on-site diagnostician: the outcome is either fixed on the spot, or the advisor is **authorised to raise the DOR themselves directly** if it's unrepairable — this is a different, advisor-initiated flow, not something that only surfaces later on a statement. *(confirmed; the exact set of outcome options the Hillarys app presents is not yet confirmed — see Open Questions)*

## Job identifiers

- `job_code` format: one letter followed by three digits (e.g. `H342`, `Q267`), sometimes with a trailing letter suffix (e.g. `H301A`). **Validation regex: `^[A-Z]\d{3}[A-Z]?$` — hardened.** The trailing letter suffix is accepted but its meaning (revision marker, multi-order-per-visit indicator, etc.) remains unconfirmed. Matching logic must handle both `H342` and `H301A` as the same job code base.
- `job_code` is the primary cross-document match key — it appears on quotes, receipts, delivery notes, fit-completion receipts, and commission statements. The longer numeric `order_number` is secondary and only appears at fit stage. *(confirmed)*
- `customer_number` (company-issued) is durable across every appointment type for a given customer — sales, survey, fit, service call all reference the same number. *(confirmed)*

## Measurement

- Units are **centimetres**, not millimetres. Default tolerance is **1cm**. *(confirmed against the working prototype — earlier drafts used mm and 5mm and were wrong)*
- Working width/drop is the **minimum** of the three readings (top/middle/bottom for width; left/centre/right for drop), not an average. *(confirmed)*
- Squareness is checked via the difference between the two diagonal measurements (top-left→bottom-right vs top-right→bottom-left).

## Mileage

- Use HMRC's Approved Mileage Allowance Payments rates, **as a config value, never hardcoded** — they can and do change (55p/mile for the first 10,000 business miles, 25p/mile thereafter, effective 6 April 2026, confirmed as the first change to this rate since 2011). Store as `hmrc_mileage_rate_tier1`, `hmrc_mileage_rate_tier2`, `hmrc_mileage_threshold_miles` on the Advisor record, editable.

## Scheduling

- The industry-quoted install-only benchmark (~15–17 minutes/blind) is **not** the number to schedule against — it excludes prep and cleanup. The realistic full-job figure is closer to **~33 minutes/blind**, and should ideally become a value learned per-advisor from real visit durations over time rather than staying a fixed default. *(confirmed; the fixed default is a placeholder until enough real data exists)*
- Schedule-risk check: `estimated_duration_minutes = blind_count × full_job_minutes_per_blind`, compared against the actual time gap to the next booked visit — using the company's own flat-slot booking as the thing being checked, not replaced.

## Open Questions (do not treat as confirmed)

- Does a warranty-malfunction DOR ever appear on the commission statement at all, or is it purely operational with no pay impact beyond the flat £20 service-call fee?
- What does the trailing letter suffix on some job codes (`H301A`) actually mean — revision, multi-order-per-visit, something else? **Regex `^[A-Z]\d{3}[A-Z]?$` is hardened; matching logic handles both forms.**
- Is theft ever attributed to the advisor (e.g. an unlocked van), or is "raise the DOR, no fault assigned" the only real-world case?
- What is the complete, exact set of outcome options the Hillarys app shows on a service-call screen? Currently a placeholder guess (`repaired_on_site` / `dor_raised_unrepairable` / `escalated`) — replace with the real options once screenshots are available.
- Does a DOR ever appear *only* as a commission-statement line with no fit-completion-receipt signal at all, in every case, or was that just true for the examples seen so far?
