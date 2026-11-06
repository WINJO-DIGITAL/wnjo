# Environment variables

Never commit real values. Set them in Vercel (Project → Settings → Environment Variables) and in a local `.env.local` (git-ignored).

| Variable | Scope | Purpose | Status |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | public | Canonical URLs, sitemap, Open Graph | Optional until the domain is confirmed |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL | Set in Vercel (production and preview) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Browser key, protected by row-level security | Set in Vercel (production and preview) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only, sensitive** | Writes enquiries, quotes and other server records | **Not set. Required before the server writes can run.** Copy from Supabase → Project Settings → API keys. Mark as sensitive in Vercel. |
| `RESEND_API_KEY` | server only | Sends enquiry email | Not set |
| `ENQUIRY_TO_EMAIL` | server only | Where enquiries are emailed | Not set |
| `ENQUIRY_FROM_EMAIL` | server only | Sender address (domain must be verified in Resend) | Not set |

Not yet configured, and required by later steps: Stripe test-mode keys, the xAI (Grok) API key, and GitHub App credentials.

Rules:
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser. Only put public, row-level-security-protected values there.
- The service role key bypasses row-level security. It must only ever be read in server code.
