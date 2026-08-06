# PR: [short description]

**Phase / feature:** [reference]
**Spec reference:** [docs/Architect.md and/or docs/BusinessRules.md sections implemented]

## What was built (plain English)

[Table or short list: feature → where it lives → what it replaces/adds. See skills/review/SKILL.md for the expected shape — this is what the founder actually reads.]

## Judgment calls made

[Anything decided that wasn't explicit in the spec, and why. If none, say so.]

## Manual test checklist (3 items or fewer, each doable in a couple of minutes)

- [ ]
- [ ]
- [ ]

## Non-negotiables checklist

- [ ] No core action requires two free hands
- [ ] Core capture works offline; nothing claims AI completion while offline
- [ ] AI calls are server-side only (Edge Functions); no client-side key
- [ ] Every AI output is a draft requiring confirmation, no auto-send/auto-delete
- [ ] RLS in place for any new/changed table
- [ ] Money/percentage inputs validated with visible errors, no silent fallback
- [ ] External lookups (geocoding, etc.) fail visibly with a retry path
- [ ] Measurement units are cm; HMRC rate (if touched) is config, not hardcoded

## Validator Report

- [ ] validation-report.md attached
- [ ] All automated checks: PASS
- [ ] All 9 non-negotiables: PASS (evidence documented)
- [ ] Validator status: PASS

## Blockers / open questions

[Explicit, rather than worked around silently.]
