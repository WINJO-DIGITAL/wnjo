# Website improvement audit

Working list for the wnjoweb.co.uk improvement brief. Updated as each batch is committed. Nothing here is pushed to
preview or production until the owner asks.

## Audit findings (current state)

- **Rendering:** every public page returns its heading and main content without JavaScript (checked on `/`, `/build`,
  `/contact`, `/pricing`, `/faq`, `/websites`, `/booking-software`, `/about`, `/work`, `/privacy`).
- **Phone:** no click-to-call link, and no real business telephone number exists in the code. The only number is a
  placeholder inside the booking demo (`07700 900123`). Not invented anywhere.
- **Email:** no public contact email in the code; the enquiry destination is set in the server environment.
- **Legal:** Privacy page exists and describes storage honestly. Terms and Cookies pages were missing (added as drafts).
- **Footer:** short link list, states "No cookies / No trackers". Analytics: none found in code. Sign-in session and
  configurator answers do use browser storage (described on the Cookies page).
- **Booking demo:** has a Pause control. Moving content must be pausable (WCAG 2.2.2), so it stays, now labelled
  "Pause animation" / "Play animation".
- **"Bespoke" letter-spacing:** not found in the current build's CSS or computed styles. Owner to point to where it
  appears.
- **404 page:** exists; now links to Pricing, Websites and Contact.
- **Forms and integrations:** enquiry, quote, balance, deposit and client-invite flows exist and are covered by
  database tests. Live submission has not been re-tested on the public site.

## Done in this batch (committed locally, not pushed)

- Draft Terms and Cookies pages, added to the footer. Items needing confirmation are in square brackets.
- 404 page routes to Pricing, Websites and Contact.
- Booking demo control labelled clearly.

## Decisions from the owner (recorded)

- **Phone:** the EV Exec business number is shared by both companies. It is shown only as a "Call us" button, never as digits. It is set in the environment as `NEXT_PUBLIC_CONTACT_PHONE` and no call link appears until it is set.
- **Email:** never shown or linked as an address. "Email us" opens the enquiry form.
- **VAT:** WNJO is not VAT registered. The shared VAT note and the terms say so.
- **Payment terms:** 50% deposit on acceptance, 50% once the owner has reviewed the finished site and before it goes live. Otherwise standard industry terms.
- **Trust:** no years-in-business or launch-count claims. Reviews from clients and a Google Business profile come later.
- **Examples:** the four example businesses in the homepage styler are labelled as examples, not real websites. Real client sites are shown as real.

## Needs business information before it can go further

- Confirm the town for the address: the notes say "Taunton Cleveleys" and the postcode is FY5 (Cleveleys).
- Confirm the legal name wording: "WNJO" or your full name trading as WNJO.
- Confirm the hosting cancellation notice period, and how UK consumer cancellation rights apply to online orders.
- Terms: revision rounds and extra-round charges, hosting and care terms, cancellation and refund terms, liability,
  governing law, use of stock or third-party material.
- Permission and details for each portfolio item and testimonial (full name, business, location, photo, live URL).
- Years in business, number of sites launched, and any certifications or memberships. Only add what can be verified.
- Confirmation of the "No cookies / No trackers" wording given that sign-in stores a session in the browser.

## Next batches (in order)

1. Accessibility pass: automated checks and keyboard testing of navigation, forms and the FAQ.
2. FAQ: accordion with categories and search, using existing content.
3. Pricing presentation: the £1,800 upfront and £25 per month figures, as a clear section. Pricing figures are taken from
   the existing catalogue; nothing new is added.
4. Homepage: remove repeated calls to action and repeated slogan lines; clearer section order.
5. Portfolio with industry filters, using only verified projects.
6. Metadata, Open Graph, structured data and sitemap checks.

## Progress against the 26-point brief (local commits, not pushed)

| # | Item | State |
|---|---|---|
| 1 | Visual identity | The existing identity (Playfair, Inter and mono type; sand, espresso and terracotta palette; one button system with hover, press, focus and disabled states; 30 reduced-motion rules) was reviewed and kept. No full redesign: needs a design direction from the owner. The "Bespoke" letter-spacing was not found in the build. |
| 2 | Homepage | One Get my price under the hero, carried by the bottom bar after the hero; repeated buttons removed; "bespoke" repetition and the unmeasured speed claim removed; trust row and owner quote details added. Oak & Ember is a fictional example, so it is labelled as one, not linked. |
| 3 | Pricing | "How the money works" cards on the pricing page, from the price list. |
| 4 | Industries | One line per business type under the homepage styler (café, barber, electrician, physio). |
| 5 | Portfolio | Industry filter on /work for the four real projects; works without JavaScript. |
| 6 | Testimonials | Owner quotes show business location and a link to the live site. No invented details. |
| 7 | Booking demo | Three-step explanation and an example-details note; pause control labelled. |
| 8 | Enquiry | Tested in a browser: validation stops empty steps, busy state while sending, clear failure message. Plain no-JavaScript form with Message received / not sent pages. Live delivery needs the deployed site. |
| 9 | Navigation | Breadcrumbs on internal pages; footer links updated. |
| 10 | Phone | Call us in the footer, bottom bar and phone menu (placeholder number until the EV Exec number is confirmed). |
| 11 | Footer | Location, contact buttons, Our work, Resources, Terms, Cookies, precise cookie line. |
| 12 | Legal | Terms and Cookies drafts; Privacy existed. Solicitor review recommended. |
| 13 | Accessibility | axe WCAG 2.2 AA on 19 pages at 390 and 1280 px: no violations except incidental text in the decorative spreadsheet illustration on /app-development (exempt under 1.4.3; the illustration has a text alternative). Keyboard: every stop on tested pages shows a focus ring. |
| 14 | FAQ | Topics, search, accordion; works without JavaScript. |
| 15 | JavaScript | Contact and build pages work without JavaScript; dead controls hidden; phone hero server-rendered. |
| 16 | Performance | Lighthouse (local production build, simulated slow phone): accessibility, best practices and SEO 100 on /, /pricing, /websites, /contact; performance 82–94; CLS 0–0.03. Homepage LCP 4.8 s is now the family line's typing effect (protected; owner decision). Lab figures only, so no speed claim is made on the site. |
| 17 | Trust | Published commitments only (written price, 50/50, support period) and real projects. |
| 18 | Resources | /resources with one practical article; sitemap and robots checked. |
| 19 | Structured data | ProfessionalService, WebSite, BreadcrumbList and Article, checked in rendered HTML. Google's Rich Results Test needs the live site. |
| 20 | Social sharing | Open Graph and X cards on every page, 1200 × 630 image, canonical URLs, checked in rendered HTML. |
| 21 | Errors | 404 links to Pricing, Websites and Contact; form failure pages; unknown articles return 404. |
| 22 | Domain | Unchanged. |
| 25 | Verification | 19 pages at two widths: right status, no broken images, no console errors, 30 internal links all resolve. Unit tests, typecheck, lint and build pass. |

## Round 2 (owner feedback)

- Hero: Phone/Tablet switch and arrow row removed; pills, phone, one price button. Tablet screenshots no longer load.
- Avoiding template tells (purple gradients, rounded boxed cards with matching shadows, three icon cards, emoji, many
  competing calls to action, stock headings): pricing steps and resources restyled as editorial rules.
- Example sites in the styler: full-photo hero, two buttons, info strip, detailed cards, per-business type and colour.
- Price form: Skip the details and see my estimate on every step before the review; confirmation says the estimate is
  followed by a bespoke quote by email (no time promised).
- Contact form: budget and timing optional. Phone number confirmed as the work number. Hosting: 30 days' notice.
- Lighthouse homepage (local, simulated slow phone): 82, LCP 4.7 s, the family line's typing. Measured without the
  family line: 84, LCP 4.3 s, the first owner quote; that remaining delay is to investigate after the family line
  decision.
- Pending owner: second confirmation to remove the family line (CLAUDE.md requires two); live checks need a deploy.

## Round three

- Owner: business name WNJO; terms confirmed (draft notices removed); Duratec and offers left out.
- Owner quotes are visible on load (no reveal wrapper). Lighthouse varies between runs (81 to 88); the largest element waits on the page's CSS and fonts.
- Quote follow-up: one reminder to customers whose quote is still open after 3 days, sent by the daily sweep, once per quote (migration 20261107190000; due-quote selection checked live).
- Booking demo: each listed step moves the replay to its screen and holds there; start times are read from the replay's timeline.
- Live checks: `node scripts/live-check.mjs https://www.wnjoweb.co.uk` covers pages, 404, sitemap, robots, canonical and Open Graph after every deploy. Still to run: enquiry and email delivery by hand, and Google's Rich Results Test on the homepage.
