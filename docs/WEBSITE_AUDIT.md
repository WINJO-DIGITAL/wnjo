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
