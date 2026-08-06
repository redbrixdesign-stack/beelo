# Supabase

**Consult this whenever:** you're touching schema, RLS, Auth, Storage, or an Edge Function.

## Rules

- **RLS on every table, no exceptions**, keyed to `advisor_id = auth.uid()`. This is not a Phase 5 hardening task — it's part of the schema from the first migration that creates the table.
- **The Claude API key lives only in Edge Function environment variables.** The client never sees it, never calls the Claude API directly. Any feature that needs AI (OCR, transcription, drafting) goes through an Edge Function.
- **AI provenance fields** (`model_version`, `prompt_version`, `confidence`, source document/event IDs) are added in **Phase 3** when AI extraction begins — not in Phase 1–2 schema. Don't add them prematurely.
- **Single Supabase project with `source_env` flag** (`demo` | `qa` | `live`) on every record and a persistent UI badge showing which environment you're in. Separate projects are a pilot-launch decision, not a development requirement. Never let it be ambiguous which environment a piece of data belongs to.
- **Storage access is always via signed URLs**, short-lived, never a public bucket.
- Migrations should be additive and reversible where possible — this is a solo project with no dedicated DBA reviewing every change, so err toward safety over cleverness.

## Before writing a migration

Check `docs/Architect.md` §11 for the entity's full field list and `docs/BusinessRules.md` for any rule that constrains a field's valid values (e.g. the `job_code` format regex `^[A-Z]\d{3}[A-Z]?$`, the `cause`/`counts_toward_dor` relationship on Incident). Encode what you can as a database constraint, not just application-level validation — a second AI agent working on this repo later shouldn't be able to accidentally violate a business rule that the schema itself could have prevented.