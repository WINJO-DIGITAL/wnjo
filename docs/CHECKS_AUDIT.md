# Audit of the site checks (15 November 2026)

## What the checks do

Every built site runs through `checkSite` in `src/lib/site-template/checks.ts`. A site that fails goes back to the model with the reasons, up to three times, then to a person marked "failed". The live test counts a site as "passed" only when it clears every check.

About 60 checks in total. They fall into four groups:

1. **Facts checked exactly.** Prices, phone numbers, emails, addresses, hours, service names and areas. The site must match the customer's facts, or the check fails.
2. **Wording rules.** Filler phrases, placeholder text, markup, word and sentence length, a copied-wording check, and a clear next step at the top and bottom.
3. **Sector claim rules.** A short list of banned phrases per sector, such as "guarantee" for plumbing or "cure" for physio, with some lifted by a customer's own tick.
4. **Structure.** Sections in the right order, pages present, no empty sections, too many items.

## What it does not check

The model writes the headline, the intro, the tagline, the page headings, and the FAQ answers. Only the FAQ answers are checked against the customer's facts, and that check is a word-overlap rule, not a judgement of meaning. The headline, intro, tagline and page headings are not checked against the facts at all.

## Probe results

Fifteen deliberately wrong sites, built from the barber sample with one sentence changed each:

| Wrong sentence | Result |
|---|---|
| "Over 25 years of experience" | Passes |
| "Award-winning barbers" | Passes |
| "Trusted by over 5,000 customers" | Passes |
| "Fully trained and qualified" (barber has no claim rule) | Passes |
| "We also offer beard transplants" (not a customer service) | Passes |
| "Open 7 days a week" | Passes |
| "We guarantee a free re-cut" | Passes |
| "The best barbers in Leeds, hands down" | Passes |
| "Ask for Mike, our senior barber" | Passes |
| "Over 20 years of expertise" (page heading) | Passes |
| "Haircuts from just £12" | Caught: price invented |
| "Ring us on 0113 496 0000" | Caught: phone invented |
| "A passionate team delivering excellence" | Caught: filler |
| Headline of 14 words | Caught: too long |
| "A family barber shop on the high street" (fine) | Passes |

So the checks catch invented prices, phone numbers, filler phrases and length. They do not catch invented experience, awards, numbers of customers, qualifications, guarantees, superlatives, staff names or extra services, except where a sector's own rule happens to list the word.

## What this means

- The 44 of 44 result on the live test means no invented price, phone number, email, address or hours, no filler, and no over-long wording. It does not mean the copy is free of invented claims.
- The "never invent" rule is enforced for prices, contact details and hours, and only partly for FAQ answers. It is not enforced for the hero, the intro, the tagline or the page headings.
- Only sectors with a claim list (physio, massage, beauty, fitness, holiday let, plumbing, building, cleaning, and the others with a list) block claims like "qualified" or "guarantee". Barber, café and the rest rely on the prompt alone.

## Recommended fixes, in order

1. **Check every model-written line against the facts.** Flag any number that isn't in the customer's facts (years, counts, ages, dates). Flag "award", "winning", "best", "top", "leading", "finest", "guarantee", "warranty", "certified", "qualified", "trained", and "since" unless the customer wrote it. Flag capitalised names not in the facts. Flag any service named that isn't in the list.
2. **Apply the sector claim list to every sector,** with a shared base list in addition to each sector's own words.
3. **Measure before trusting it.** Take a set of real model lines, mark by hand which contain an invented claim, and record how many the checks catch and how many they wrongly flag. Tune until the misses are rare.
4. **Show the model's lines on the panel for every site,** not only failed ones, so you can read the wording directly. This already exists; it's worth keeping visible.
5. **Fix the checklist item.** "Tune the checks" should now mean tightening, not loosening.

Until fix 1 is in, the live test results should not be read as "the copy is safe".
