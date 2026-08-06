# Security standards

- **RLS on every table, from the first migration.** Not a hardening pass — see `skills/supabase/SKILL.md`.
- **No secrets in client code, ever.** The Claude API key lives only in Edge Function environment variables. If you find yourself about to put a key in a `.env` file that ships to the client, stop.
- **Signed URLs, short-lived, for all Storage access.** No public buckets, no long-lived URLs for evidence (photos, voice recordings, scanned documents).
- **Strict input validation on money and percentage fields**, rejecting invalid values with a visible error. This is a security property as well as a correctness one — the class of bug that silently accepted a >100% discount is the same class of bug that, elsewhere, becomes a real vulnerability.
- **No PII in analytics.** If telemetry is added, it must be opt-in and must not log customer names, addresses, phone numbers, or job content.
- **Environment separation via single Supabase project + `source_env` flag** (`demo` | `qa` | `live`) on every record with persistent UI badge. Separate Supabase projects are a pilot-launch decision, not a development requirement. See `skills/supabase/SKILL.md`.
- **DPIA is a pilot-launch checklist item, not a development standard.** This project handles customer names, addresses, phone numbers, and photos of people's homes — treat as sensitive from day one, but formal DPIA happens at pilot launch.
- **Consent is explicit and revocable.** The Advisor record's `consent_status` field must be checked, not assumed, wherever the app does anything with an advisor's data beyond core local capture.