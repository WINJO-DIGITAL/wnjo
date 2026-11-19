# Launch checklist

Only the work still open before launch. Completed items are in git history (this file before 17 November 2026).
Nothing here is pushed or deployed until the owner says so.

## Launch tonight: manual build (no AI)

Production is already in manual mode (checked live 17 November 2026): nothing is built automatically, the owner is
emailed the brief and builds each website by hand. The AI key and the template checks do not gate this launch.

- [ ] **1. Handover test on a hand-built website** (needs the latest code deployed, because it fixes the pack for hand-built sites).
  1. Pay for a test outright website in Stripe test mode and send the goals.
  2. Open Admin, Website builds. Confirm the brief email arrived and the website shows "I build them myself".
  3. Paste a test https address and release it as the customer's preview. Open the customer account and check it shows.
  4. Approve it as the customer, pay the balance in test mode.
  5. In Admin use "Final payment and handover": download the pack as staff. It should hold `README.txt`, `your-brief.txt` and `files/`.
  6. Tick the six items, hand over, then sign in as the customer and download the same pack.
- [ ] **3. Audit before launch (without the AI).**
  - Signed-in account and admin screens: every page and action, including what a customer sees of someone else's data. Confirm each of the eleven functions the Supabase advisor lists as callable by signed-in users checks who is calling.
  - Live payments: the plan checkout, the deposit and balance, the billing portal, and the webhook's handling of each event, including retries.
  - Public site on phone and desktop: visual polish, the buying path (tiers, hosting, six questions), wording.
  - Emails as sent in a real inbox.
- [ ] **4. Read each hand-built website before it goes to the customer.** Check every claim (licences, insurance, hours, reviews) is something the customer told us.

## After launch

- [ ] Template checks on a live run: read the first AI-built customer's site before it goes live, once automatic mode is switched on.
- [ ] The AI's live reply shape for bespoke builds, once the key is in.
