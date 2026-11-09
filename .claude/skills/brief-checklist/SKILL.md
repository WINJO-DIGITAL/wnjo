---
name: brief-checklist
description: Cross-reference a project brief (a long prompt listing phases and requirements) against the WNJO Digital code, origin/main and the live production deployment, and report what is done, partial, missing or blocked as an easy checklist. Use this whenever the user says "cross reference", "check what's left", "what's been done", "check the brief", "audit against the prompt", "what's left to do", or pastes a phased brief and asks where the project is up to, even if they don't name this skill.
---

# Brief checklist

Turn a phased brief into a short status checklist that shows what the repo and production actually contain.

## Steps

1. **Read the sources of truth.**
   - `git fetch origin main` and read `origin/main` (not the local checkout, which can be stale).
   - Find the production commit: call the Vercel tools (`list_deployments`, target `production`, project `prj_TEAFPhMdB4Q1d7qYyNgr4snpHwPw`) and read `meta.githubCommitSha` of the READY deployment.
   - Check whether production and `origin/main` match. If they don't, say so first.
   - Check the migrations applied on Supabase (project `oqwkvrhkgmuhrrxfsahx`) against `supabase/migrations/`.

2. **Check each requirement, one at a time.** Use targeted `git grep` on `origin/main` for the feature's words, and open the file when a hit looks promising. A hit alone is not "done": confirm the behaviour exists (a route, a table, a button that calls it). Use the status marks below.

3. **Write the report** in the format below. Keep every line short.

## Status marks

- ✅ done: built, on main, and checked
- 🟡 partial: some of it is built; say which part is missing in five words or fewer
- ❌ missing: not found in code
- ⛔ blocked: needs a key, a decision or access from the owner

## Report format

```
## Production
Live: <commit short sha> (<date>) · main: <sha> · match: yes/no

## Phase 1 · <name>
✅ <item>
🟡 <item> — <missing bit>
❌ <item>

## Phase 2 · …
(repeat for each phase in the brief)

## Decisions needed
1. <one short question>
2. …
```

Rules for the report:
- One line per item. No paragraphs.
- Use the brief's own phase names and numbers.
- At most one short line of detail per item.
- Put "not verified in a browser" or "Stripe not tested" in Decisions needed or a footnote line, not in every item.
- Never claim a feature works from its name alone. If it isn't checked, mark it partial.

## Known repo facts (update when they change)

- Stack: Next.js (App Router), Supabase (Postgres, RLS, storage), Stripe, Vercel project `winjodigital`.
- Production branch: `main`. Designated work branch: `claude/vibrant-einstein-s8gm8a`.
- Brief stage names in the database differ from the brief's status labels; flag that as a gap, not a bug.
- Tests: `npx vitest run`. Type check: `npx tsc --noEmit` reports only missing generated `next-env.d.ts` image errors on a fresh clone; ignore those.
