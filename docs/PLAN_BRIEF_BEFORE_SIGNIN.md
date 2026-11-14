# Plan: answer the six questions before signing in

Status: BUILT (14 November 2026), awaiting a live check. The owner chose the recommended options: a write-only pass,
48 hours, and no opening of uploaded files before sign-in. Built in commits `5a1bb91` and the one after it.

## The problem

Someone buying a website outright fills in a short form (name, business, email, phone) on `/build/project`. Today
they are then told to open an email, sign in, and only then answer the six questions about their website. That gap
is the biggest drop-off in the journey: they have momentum, and we send them away to their inbox.

## The goal

After the short form, the six questions open on the same screen. The customer answers them and sends them without
leaving the page. Signing in is only needed later, when there is something private to see (the proposal, the
payment, the preview).

## How it works for the customer

1. They fill in the short form and press Continue, as now.
2. The six questions appear straight away, with their name and business already filled in.
3. They answer and press Send. The screen says the brief is with us, and that the proposal will arrive by email.
4. The email they get still has the sign-in link. If they stopped halfway, signing in picks up where they left off.

## How it works underneath

- When the short form is accepted, the server gives the browser a **brief pass**: a signed, time-limited token for
  that one request. It is stateless (signed with a server-only secret), so it needs **no database change**.
- The pass is bound to one brief, and it expires after 48 hours.
- With the pass, the browser can do exactly three things, all for that one brief:
  1. save progress on the questions,
  2. upload files to its own draft folder (uploads are already allowed without sign-in on the plan flow, with limits),
  3. send the finished answers once.
- The existing signed-in routes stay as they are. The pass is a second, narrower way in to the same save code.

## What the pass can never do

This is the part that matters. The pass is **write-only**:

- It cannot read anything stored about the customer: not their email, phone, saved files, proposal, payment or
  preview. Reading always needs a signed-in, verified email, as it does today.
- It cannot see another person's brief. It is bound to one brief id, checked on the server.
- It stops working once the brief is sent, once the brief moves past the editable stages, or after 48 hours.
- It cannot accept a proposal, pay, approve a preview or ask for changes. Those all stay behind sign-in.

## Risks, and why they are acceptable

| Risk | What stops it |
|---|---|
| Someone types another person's email and fills in a brief | They can already send the short form with any email today. They gain nothing: the proposal goes to the real owner of the email, who must sign in to see it. Nothing stored is shown to the sender. |
| Someone steals a pass | A pass only lets them add answers to one unsent brief for 48 hours. It reads nothing. Passes travel only in the page's memory and requests, never in a link or an email. |
| Spam briefs | The short form already has a hidden-field check, a timing check and a limit of 5 per 10 minutes per connection. The pass routes get their own limits. |
| Half-finished briefs with no way back | Progress is saved under the brief. The acknowledgement email's sign-in link resumes it, as now. |

## Build steps (each its own commit, each with tests)

1. **The pass:** make and check the signed token (brief id, expiry). Tests: accepted when valid; refused when
   expired, altered, or for a different brief.
2. **Server routes:** let the progress, upload and send routes accept the pass as well as a signed-in customer.
   With a pass, they refuse every read. Tests: a pass cannot read known contact details, files or progress saved by
   someone else; cannot be used after the brief is sent; cannot be used on another brief.
3. **The page:** after the short form succeeds, show the six questions in place, using the existing wizard with a
   pass-based connection. On send, show a confirmation in the same style as the payment confirmation.
4. **Emails:** the acknowledgement email says "your answers are with us" when the brief was sent in one go, and
   "pick up where you left off" when it wasn't.
5. **Check on the live site:** walk the whole path on a phone and a desktop, then confirm in the database that the
   brief is stored once and the build is at the right stage.

## What does not change

- The six questions themselves, and everything after them: proposal, deposit, preview, changes, balance, handover.
- The monthly plan flow, where payment comes first.
- Signing in. It still protects everything private.

## Decisions for the owner

1. **Go ahead with the write-only pass?** (Recommended.)
2. **How long a pass lasts:** 48 hours is suggested. Shorter is safer; longer is kinder to someone who comes back
   the next day in the same browser tab.
3. **Viewing uploaded files before sign-in:** suggested answer is no. The customer sees the file names they just
   added, but opening a stored file needs sign-in.

## Estimate

About a day of careful work, mostly in tests for the access rules. No database change. One small server secret is
derived from an existing server-only key, so there is nothing new for the owner to set up.
