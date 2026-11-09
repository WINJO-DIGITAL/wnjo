---
name: audit-last-prompt
description: Audit the most recent change requested by the owner to see whether it improved the WNJO Digital website. Use this whenever the owner says "audit last prompt", "audit the last change", "did that improve the site", "was that better", or asks whether a change helped, even if they don't name this skill.
---

# Audit last prompt

Judge the last change against what it was meant to do, and say plainly whether it helped. Do not change any code.

## Steps

1. **Identify the change.** Read the last commit(s) on the designated branch that came from the owner's request, and the owner's wording. One line each.
2. **Check it is live or previewed.** Is the commit on `origin/main`? If not, say the change is not live yet, so the audit is of the code, not the site.
3. **Check the code does what was asked.** Read the changed files. Tick each part of the request (done / partly / not done).
4. **Check the risks.** Look for: a database migration not yet applied, copy that could mislead (prices, promises), layout problems on phones, and anything that bypasses approvals or the owner's rules.
5. **Give a verdict** in four short lines: Improved / Mixed / Not improved / Can't tell yet, the main benefit, the main risk, and what would settle it (a live check, a browser check, or a test the owner runs).

## Rules

- Do not change code, copy or designs while auditing.
- If there's no live version to compare, say "can't tell yet" rather than guessing.
- Keep it short. The owner reads this on a phone.
