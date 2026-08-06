# Prompt: debug an issue

Use this when something's wrong and the cause isn't obvious yet. Pair with `templates/Bug.md` to record the outcome.

```
Something's wrong: [describe what happened, and what you expected instead].

Before proposing a fix:
1. Reproduce it, or explain clearly why you can't.
2. Check whether this falls into one of the known-risky categories from
   AGENTS.md's non-negotiables: a money/percentage validation gap, a silent
   offline/AI-completion claim, a silent external-lookup failure, or an
   RLS/tenant-isolation gap. If it does, say so explicitly — these are the
   classes of bug this project has hit before and cares most about avoiding
   again.
3. Check docs/BusinessRules.md in case this is actually a business-rule
   misunderstanding rather than a code bug — e.g. incorrect commission math
   or DOR logic often traces back to a rule in that document being
   implemented slightly differently than it's stated.

Then propose a fix, and note whether a test should be added per
standards/testing.md so this class of bug can't silently recur.
```
