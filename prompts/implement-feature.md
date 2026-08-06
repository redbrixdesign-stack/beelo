# Prompt: implement a feature

Use this for any single feature or phase, once `AGENTS.md` and the relevant `docs/` files are already in the repo the agent has access to (they don't need to be re-attached every time, unlike in early sessions before this repo existed).

```
Read AGENTS.md, then the relevant sections of docs/Architect.md and
docs/BusinessRules.md for: [describe the feature/phase].

Follow the phase-gate process in AGENTS.md exactly:
1. Restate what this covers in plain language.
2. Propose file/folder structure and any new dependencies.
3. Propose schema/migration and RLS changes, if any.
4. Wait for my go-ahead before writing code.

Use templates/Feature.md to structure your restatement if it's easier than
free text.

Do not implement anything beyond this feature's scope. If something you need
isn't covered by docs/, stop and ask rather than guessing.
```
