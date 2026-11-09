---
name: feedback-options
description: How to respond when the user says they don't like something, is unhappy with a change, or says "I don't like", "not keen", "change that", "no", "hate", "looks wrong", or rejects a design, wording or layout. Use this whenever the user gives negative feedback on a design, copy or behaviour in the WNJO Digital site, even if they don't ask for options. The rule is to not change the work yet, and to offer three alternatives for the user to choose from.
---

# Feedback options

When the user says they don't like something, do not change the code, copy or design. Instead, offer exactly three alternatives and wait for the user to choose.

## Why this rule exists

The owner reviews the live site closely, and past changes were made before the owner had chosen a direction. Changing the work on a dislike wastes effort and sometimes reverts something the owner wanted. Three options let the owner decide.

## Steps

1. **Restate the problem in one short line.** For example: "The button sits under the cards."
2. **Give three alternatives.** Each option is one line: a short label and what it changes. Keep each option to a single sentence. Make the three meaningfully different from each other, not three small variations.
3. **Recommend one.** Mark it "(recommended)" and give a one-line reason.
4. **Ask the owner to pick a number.** Then stop. Do not edit files, commit, or push.

## Format

```
[One-line restatement of the problem.]

1. [Option label]: [what changes]
2. [Option label]: [what changes]
3. [Option label]: [what changes] (recommended: [one-line reason])

Which one should I do?
```

## Rules

- Make no code changes until the owner picks an option.
- Don't ask the owner to explain the dislike first unless the option you'd offer depends on it.
- Keep wording and layout options within the brand: minimal, premium, no red dots before headings, no new colours, and no family line (see CLAUDE.md design rules).
- If the owner has already picked an option, make only that change, then run the usual checks and push to the designated branch.
