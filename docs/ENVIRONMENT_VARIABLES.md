# Environment variables

Never commit real values. Set them in Vercel (Project → Settings → Environment Variables) and in a local `.env.local` (git-ignored).

| Variable | Scope | Purpose | Status |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical URLs, sitemap, Open Graph | Set to `https://winjodigital.co.uk` (Vercel, production and preview, 8 Nov 2026). `www` redirects to the bare domain. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL | Set in Vercel (production and preview) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Browser key, protected by row-level security | Set in Vercel (production and preview) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only, sensitive | Writes enquiries, quotes and other server records | Set in Vercel (production and preview). |
| `RESEND_API_KEY` | server only, sensitive | Sends enquiry email | Set in Vercel (production and preview) to a send-only key restricted to `winjodigital.co.uk`, created 8 Nov 2026. |
| `CRON_SECRET` | server only, sensitive | Bearer token Vercel Cron sends to `/api/cron/briefing`; requests without it are refused | Set in Vercel (production and preview), generated 7 Nov 2026. |
| `ENQUIRY_TO_EMAIL` | server only, sensitive | Where enquiries and staff alerts are delivered (never shown on the website). One address, or several separated by commas. | Set to the owner's inboxes, for example `hello@winjodigital.co.uk, winjodigital@gmail.com` |
| `ENQUIRY_FROM_EMAIL` | server only | Sender address (domain must be verified in Resend) | Set to `WINJO DIGITAL <enquiries@winjodigital.co.uk>` (8 Nov 2026). `winjodigital.co.uk` is verified in Resend. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | Cloudflare Turnstile site key for the contact form | Unset. The form does not show the check until this and the secret are both set. |
| `TURNSTILE_SECRET_KEY` | server only, sensitive | Checks the Turnstile token with Cloudflare | Unset. With either key missing, the check is skipped and enquiries are still accepted. |

Not yet configured, and required by later steps: Stripe test-mode keys, the Anthropic (Claude) API key (`ANTHROPIC_API_KEY`), and GitHub App credentials.

## Contact form check (Turnstile)

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` switch on Cloudflare Turnstile for the public contact form and the signed-in account message form. Create a Turnstile widget in Cloudflare for `winjodigital.co.uk` (and preview hosts, if previews should check too), then set both values in Vercel. Until both are set, the forms keep the hidden field and the short timer, and nothing is blocked. A message that looks like an unsolicited SEO pitch is still saved and emailed; the owner email is marked "Possible sales pitch" and is not discarded.

Rules:
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser. Only put public, row-level-security-protected values there.
- The service role key bypasses row-level security. It must only ever be read in server code.

## Domains

- Main domain: `winjodigital.co.uk` (Vercel, verified). `www.winjodigital.co.uk` redirects to it with a 308.
- Old domain: `wnjoweb.co.uk` and `www.wnjoweb.co.uk` are attached to the same Vercel project and redirect to `winjodigital.co.uk` with a 308, keeping the path (restored 8 November 2026; they had been returning Vercel's 404). Their DNS stays at IONOS, pointing at Vercel.
- Resend sending domain: `winjodigital.co.uk` (eu-west-1), verified, sending enabled.
- Customer correspondence goes through the website. The owner's email address is never published on the site.

## Website subscriptions (Stage 6, preview)

- Tables `website_subscriptions` and `website_subscription_payments` (migration `20261108140000`) are live in the
  shared database; nothing on the live site uses them yet.
- `STRIPE_PORTAL_CONFIGURATION_ID` (optional, server only): the Stripe billing-portal configuration customers use to
  update their card and see invoices, with cancellation and plan changes switched off (subscriptions are rolling monthly with no
  minimum term; cancellation is requested from the account page). Test mode: `bpc_1UZev9FZtOV6mSdmIeyyYYgZ` (also the test-mode default). Live mode:
  `bpc_1Uc8a4LEEs7hsljuaZley7ru` (also the live default), set in Vercel for production.
- Stripe webhook endpoints need these events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
  `customer.subscription.updated`, `customer.subscription.deleted`. Test endpoint updated 8 November 2026 to
  `https://winjodigital.co.uk/api/stripe/webhook`; the live endpoint uses the same URL (see below).
- `CALCOM_API_KEY` and `CALCOM_EVENT_TYPE_ID` (server only): when both are set, the calculator offers consultation
  booking (Stage 4). Until then it offers callbacks only.

### Fixed: live Stripe webhook URL (8 November 2026)

The live webhook endpoint (`we_1UZKdaFZtOV6mSdmHzzgDd3z`) pointed at the old domain, which now redirects; Stripe does
not follow redirects. It was changed to `https://winjodigital.co.uk/api/stripe/webhook` with the owner's approval.
Stripe held no live `checkout.session.completed` events in its 30-day history, so no live payment was missed. The
endpoint answers directly (an unsigned request gets 400 bad_signature). Its events now include
the four subscription events as well as `checkout.session.completed` (added 8 November 2026 with the subscription deploy).

### Live launch of website subscriptions (8 November 2026)
- Live billing portal configuration `bpc_1UZf7FFZtOV6mSdmmOid5SxF` (default, card and invoices only, no self-cancel).
- Live webhook events extended to the five events the subscription code handles.
- Live `hosting` care plan set to £49 a month in the database (migration `hosting_price_49`), matching the code.
- Terms version `2026-11-08.2` published with the draft notice removed on the owner's approval. A lawyer's review is
  not on record: keep this in mind before changing the terms.

