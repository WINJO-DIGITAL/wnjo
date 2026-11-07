# Environment variables

Never commit real values. Set them in Vercel (Project → Settings → Environment Variables) and in a local `.env.local` (git-ignored).

| Variable | Scope | Purpose | Status |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical URLs, sitemap, Open Graph | Set to `https://www.wnjoweb.co.uk` (Vercel, production and preview). The bare domain redirects to `www`. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL | Set in Vercel (production and preview) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Browser key, protected by row-level security | Set in Vercel (production and preview) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only, sensitive** | Writes enquiries, quotes and other server records | **Not set. Required before the server writes can run.** Copy from Supabase → Project Settings → API keys. Mark as sensitive in Vercel. |
| `RESEND_API_KEY` | server only, sensitive | Sends enquiry email | **Not set.** Create a sending key in Resend and add it to Vercel as sensitive. |
| `ENQUIRY_TO_EMAIL` | server only, sensitive | Where enquiries are delivered (never shown on the website) | Set to the owner's inbox |
| `ENQUIRY_FROM_EMAIL` | server only | Sender address (domain must be verified in Resend) | Set to `WNJO <enquiries@wnjoweb.co.uk>`. Works once `wnjoweb.co.uk` is verified in Resend. |

Not yet configured, and required by later steps: Stripe test-mode keys, the xAI (Grok) API key, and GitHub App credentials.

Rules:
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser. Only put public, row-level-security-protected values there.
- The service role key bypasses row-level security. It must only ever be read in server code.

## Domains

- Main domain: `www.wnjoweb.co.uk` (Vercel, verified). `wnjoweb.co.uk` redirects to it with a 308.
- Resend sending domain: `wnjoweb.co.uk` (eu-west-1). Verification needs the DNS records Resend issued, then a verify request.
- Customer correspondence goes through the website. The owner's email address is never published on the site.
