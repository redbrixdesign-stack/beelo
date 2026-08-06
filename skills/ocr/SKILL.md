# OCR / document extraction

**Consult this whenever:** you're building or modifying extraction for any document type.

## Document types and what each one extracts

See `docs/Architect.md` §11 for the full field list per type. Summary of the distinguishing shape of each, since they're easy to confuse — several share a very similar visual layout but extract completely different things:

| Document type | Distinguishing features | What it produces |
|---|---|---|
| `appointment_card` | Screenshot of the company's own scheduling app, not a printed document | Visit scheduling fields (time slot, status, customer number) |
| `quote_or_receipt` | "Quote Number" or similar, room-by-room list with **prices** | QuoteLineItem records — the pricing source of truth |
| `fit_completion_receipt` | "Order Number," room-by-room list with **fitted/replacement status**, total £0.00, sometimes a re-fit date | FitLineItem records — the earliest possible Incident signal |
| `delivery_drop_note` | **Multiple customers/orders on one document** | Fans out into several matched updates, not one |
| `commission_statement` | Weekly ledger, one row per money event | CommissionLineItem records — confirms/completes Incidents, drives earnings view |
| `expense_receipt` | A merchant receipt for the advisor's own costs | Expense record |

Do not assume a new document photo is one of these types by layout alone if the fields don't match — `quote_or_receipt` and `fit_completion_receipt` look almost identical at a glance (same room-by-room structure) but extract fundamentally different fields (price vs. fit status). Check the header line ("Quote Number" vs. "Order Number") and the per-line content before deciding the type.

## Non-negotiable extraction rule

**Structured fields plus `additional_notes` fallback, always.** Anything OCR sees that doesn't map cleanly to a known field goes into `additional_notes` — it is never discarded. This applies to every document type without exception.

## Confidence and review

Every extraction carries a `confidence` score and goes into a `status` lifecycle (`pending` → `processing` → `completed` | `failed` | `needs_review`). Low-confidence extractions should route to a review screen where the advisor confirms or corrects rather than the system silently accepting a guess — this is especially important for anything that feeds a financial field (QuoteLineItem pricing, CommissionLineItem amounts).

## Matching

The primary cross-document match key is `job_code` (format: see `docs/BusinessRules.md`). Secondary matching signals: `customer_number`, `customer_name` + date proximity. Never invent a new matching strategy without checking whether `job_code` alone already solves it — most of this project's document types share that one field precisely so matching doesn't need to be clever.
