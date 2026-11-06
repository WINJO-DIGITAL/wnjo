# Prompt: build the new mobile hero

Build the new phone hero for the WNJO homepage from an approved prototype. Repo: fystay/wnjo (Next.js). Before writing code, read AGENTS.md and the relevant guide in node_modules/next/dist/docs/ (this Next.js has breaking changes), and follow the design rules in CLAUDE.md. Do not remove or alter the family line (FamilyLine.tsx) or its type-as-you-scroll effect, and do not put coloured dots beside headings or labels.

## Reference (already committed)
Run: `git fetch origin claude/beautiful-hawking-swr1dc && git checkout origin/claude/beautiful-hawking-swr1dc -- docs/hero-reference`

Look at all four screenshots in docs/hero-reference/ (phone-arrival.png, phone-view.png, tablet-view.png, tablet-swiped.png) and open hero-d.html in a 390x844 viewport (a working vanilla-JS prototype; try the pills, the swipe and the Phone/Tablet switch). hero-d.html is the source of truth for layout, sizes, colours, easing and behaviour. Port it to React/CSS; do not redesign it.

## What to build (phones only, below 40rem)
Replace the phone showcase on the homepage (src/components/interactive/ShowcaseStage.tsx, used in src/app/page.tsx) with a new client component, for example DeviceDeck. Keep the existing laptop showcase unchanged from 40rem up. Mount only one of the two, so phones never download the laptop images and desktops never download the deck images.

1. Headline stays "Websites and apps that grow your business." in the existing serif plus italic orange-underline style. Keep the existing ServiceSwitcher row above it, made compact. As in the prototype, drop the lede line and the "Talk to us" button.
2. Pill rail: one pill per project (logo tile plus name, from src/lib/projects.ts). It scrolls sideways with the next pill peeking in at the right edge. The active pill is dark espresso with a soft terracotta ring.
3. Stage: a rounded dark panel tinted per project (colours are in hero-d.html). It is a swipeable coverflow: the active device is centred and full size, the neighbours peek in at the sides, smaller and dimmer. Support drag-to-follow with snap, tap a neighbour to go to it, tapping a pill, and arrow keys. Add a one-off nudge on arrival, disabled under prefers-reduced-motion.
4. Phone / Tablet switch under the stage: a sliding thumb. Switching morphs every card between a phone frame (176px wide) and a portrait tablet frame (3:4, thin silver bezel, camera dot, about 300px wide) while the screenshots crossfade. Give it a one-off pulse ring on arrival. Label it "Tablet", never "iPad".
5. Primary button pinned below, with a contextual label: "Price a site like <Project>" (the project name in the lighter accent), linking to /build, with the micro-line "Free · No obligation · About 2 minutes". The button has a fixed height and never changes size when the label changes (no layout shift); the longest name, "Alex K Bells", must fit on one line at 360px wide.
6. The hero must fit the phone screen: size it with svh so the primary button is visible without scrolling in about 390x664 (iPhone Safari with toolbars shown). Let the stage height flex (clamp) rather than overflowing.

## To reach 90+ out of 100 for sellability (the prototype scores about 84; these close the gap)
The aim is a hero where the next step is obvious, the price question is answered, and there is a reason to trust us, all without adding clutter.

A. Answer "how much?" next to the button. In src/lib/pricing.ts, find the lowest package price (PACKAGES / estimate()) and show it as a quiet "From £X" line directly above or inside the micro-line, using formatGBP. Gate it behind one constant that is true only when PRICING_STATUS === "confirmed" (pricing is currently "provisional" and has not been signed off, so do NOT invent or hard-code a number; when the gate is off, render nothing and keep the layout identical). If a VAT note is needed use VAT_NOTE. Tell me in your summary that this is ready to switch on once the owner confirms pricing.
B. Add one line of trust from a real owner. src/app/page.tsx already has OWNER_QUOTES (EV Exec and Boonma, approved by the owners). Under the button, show the quote of whichever project is active, with the owner's logo and "Owner, <Project>", crossfading as the user swipes. Use the approved wording verbatim and never edit or invent a quote; clamp to 2 lines with an ellipsis if needed (the full quote already appears in the owner-quotes section further down). For projects with no approved quote (FYStay, Alex K Bells) reserve the same space and show nothing, so the layout never jumps. Move the quotes data into src/lib/projects.ts (or a small shared module) so the homepage section and the hero read one source.
C. Keep the first screen uncluttered. Priority if space is tight at 390x664: primary button, stage, pills, headline, services row, switch label. If everything does not fit, shrink the stage first, then compact the services row; never shrink the button or push it below the fold. If something still has to go, tell me instead of dropping it silently.
D. Keep the switch secondary. It must never look more important than the button: smaller, lower contrast, below the stage. Default to Phone.
E. Make swiping obvious without words: the neighbouring cards peek on both sides, the one-off nudge plays once, and there is no arrow text or instructions.
F. Performance and stability: preload only the first card's image, lazy-load the rest, zero layout shift (reserve every size), and no jank while dragging (transform and opacity only, no layout reads in the drag handler).
G. Privacy: this site says it uses no cookies or analytics (see src/app/privacy/page.tsx). Do NOT add analytics, tracking scripts or cookies. If I want to measure it later I will ask.

## Assets
- Phone images already exist in public/work/<slug>-mobile.webp.
- Tablet images: docs/hero-reference/img/<slug>-ipad.jpg. Convert them to webp (about 820px wide) as public/work/<slug>-tablet.webp, add a `tablet` field to src/lib/projects.ts next to `mobile`, and load via next/image like the others. Only the active card needs priority loading.
- Alex K Bells' live site (alexkbells.vercel.app) currently returns 404, so its tablet image was cropped from public/work/alex-page.webp. Tell me about this in your summary.

## Quality
Accessible: real buttons, aria-pressed on pills and the switch, carousel role and label, aria-hidden on off-screen cards, 44px minimum touch targets, visible focus. No new dependencies unless truly needed.

## Verify before you say it's done
Run typecheck, lint, tests and a production build. Then use the preinstalled Playwright to screenshot at 390x844 and at 390x664 (phone mode, tablet mode, after a swipe, and with the owner quote showing) and at 1280x800 to confirm desktop is unchanged. At 390x664 the primary button must be fully visible without scrolling. Check keyboard use, reduced motion, and that nothing shifts when the label or quote changes. Send me the screenshots.

Commit and push to a branch. Do not push to main unless I ask. In your summary, list what you changed and anything that deviates from the prototype, whether the From-price is switched off (and why), and your own rating out of 100 for sellability with what would raise it.
