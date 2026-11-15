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

## What was fixed (15 November 2026)

- **Every line is checked against the facts.** Each claim word (award, best, guaranteed, qualified, years, customers...) and each number in the headline, intro, tagline, page headings and any other written line must come from the customer's own words. Otherwise the check fails with "claim-not-in-facts", and the model is asked to write again without it.
- **One list for every sector,** in `src/lib/site-template/claims.ts`. Each sector's own claim rules still apply on top.
- **Question labels don't count.** The question "What are you best known for?" had put the word "best" in the facts, so any "best" passed. Only the customer's answers count now.
- **Times match the way people say them.** 18:00 counts as 6, so "9 till 6" is accepted.
- **Picture descriptions are ours,** so "photo 2" is not treated as a claim.

Tested on 11 hand-written invented claims (all now flagged) and 6 honest lines (none flagged). These are examples written by hand, not real model output, so they show the rule works, not how often a real model would trip it.

**Known gap:** a new service named in free text ("beard transplants") is not a claim word, so it still passes. Names of staff also still pass.

**Important:** the live test results before this change (44 of 44) used the old rules. Run the template test on all eleven templates again. Some sites may now fail, and the panel gives the reason for each.

## Second round of fixes (15 November 2026)

- **Services named in free text are caught.** A sentence that says what the business "offers", "provides", "specialises in", or "including" / "such as" something is read, and every other word in it must come from the customer's facts (plurals allowed). "We also offer beard transplants" now fails.
- **Names are caught.** A capitalised word in the middle of a sentence (a person, a place, a brand, a qualification) must be in the customer's facts. "Ask for Mike" and "Proudly serving Yorkshire" now fail. The first word of a sentence and days and months are skipped.
- **The prompt names the words to avoid,** so the model trips the rules less and fewer retries are needed.
- **Our own samples broke the rules and were fixed.** Three sample sites named regions ("West Yorkshire", "South Lakeland", "Greater Manchester") the customer never gave; Harrogate is not in West Yorkshire at all. They now use only the places in their facts. A test stub that sent "Plumbers for Preston" for a barber in Leeds was also fixed.
- **Saved runs, and a free re-check.** The template test now saves every site it writes, with the facts it was written from, to a new table (`docs/template_test_runs.sql`). The panel has a "Re-check saved sites (free)" button that runs today's checks on those saved sites and shows which would now fail and why. It calls no model, so a change to the rules can be tried on real wording without spending anything. The test still works if the table isn't there yet; nothing is saved until the SQL is run.

**Still caught by nothing:** a service named without an offer verb ("Beard transplants available here"), a name in lower case ("ask for mike"), and a claim worded in a way the list doesn't know ("second to none"). They are written down in `claims.test.ts` and need real wording to judge.

**What has not been checked:** the rules have never run on real model output. The 11 invented and 11 honest lines in the tests were written by hand. The first saved live run will show how often a real model trips the rules; after that, every change can be tried for free.
