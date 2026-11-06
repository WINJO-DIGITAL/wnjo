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
5. Primary button pinned below, with a contextual label: "Price a site like <Project>" (the project name in the lighter accent), linking to /build, with the micro-line "Free · No obligation · About 2 minutes".
6. The hero must fit the phone screen: size it with svh so the primary button is visible without scrolling in about 390x664 (iPhone Safari with toolbars shown). Let the stage height flex (clamp) rather than overflowing.

## Assets
- Phone images already exist in public/work/<slug>-mobile.webp.
- Tablet images: docs/hero-reference/img/<slug>-ipad.jpg. Convert them to webp (about 820px wide) as public/work/<slug>-tablet.webp, add a `tablet` field to src/lib/projects.ts next to `mobile`, and load via next/image like the others. Only the active card needs priority loading.
- Alex K Bells' live site (alexkbells.vercel.app) currently returns 404, so its tablet image was cropped from public/work/alex-page.webp. Tell me about this in your summary.

## Quality
Accessible: real buttons, aria-pressed on pills and the switch, carousel role and label, aria-hidden on off-screen cards, 44px minimum touch targets, visible focus. No new dependencies unless truly needed.

## Verify before you say it's done
Run typecheck, lint, tests and a production build. Then use the preinstalled Playwright to screenshot at 390x844 (phone mode, tablet mode, after a swipe) and at 1280x800 to confirm desktop is unchanged. Send me the screenshots.

Commit and push to a branch. Do not push to main unless I ask. In your summary, list what you changed and anything that deviates from the prototype.
