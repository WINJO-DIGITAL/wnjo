# Architecture

## Overview
- **Website:** Next.js 16 (App Router), React 19, TypeScript, deployed on Vercel. Styling is the site's own CSS (`src/app/globals.css`); Tailwind has not been adopted.
- **Database and auth:** Supabase (PostgreSQL, Auth, Storage). Every table is protected by row-level security. Browser code uses the publishable key; the server uses the secret key for writes.
- **Email:** Resend, sending from the verified `wnjoweb.co.uk` domain.
- **Payments:** Stripe. Not yet integrated.
- **AI:** provider-neutral engine (`src/lib/ai/`). The Grok adapter is written but not connected (no key).
- **Source control:** GitHub, `WNJOWEB/wnjo`. Work happens on `claude/gallant-albattani-rjj387`; `main` is what production builds from.

## Layers
1. **Pages and components** (`src/app`, `src/components`): presentation only. Anything that matters for money or access is enforced in the database or on the server, never in the page.
2. **Pure business logic** (`src/lib`): pricing (`quote-engine.ts`), quote records, catalogue mapping, briefing, event routing, AI policy, budgets, runner. These take data as arguments and have no side effects, so they are unit-tested.
3. **Server boundary** (`src/lib/*-store.ts`, `src/app/api`): the only code that holds the secret key. Marked `server-only`.
4. **Database** (`supabase/migrations`): tables, row-level security, and the functions that perform sensitive actions (`accept_quote`, `decline_quote`, `store_quote`, `decide_approval`). These check permissions themselves.

## Multi-tenancy
Every business record carries `tenant_id`. The agency is tenant `wnjo`. Staff access is granted per tenant through `tenant_members`; client access is granted per organisation through `organization_members`. Isolation is tested in `supabase/tests`.

## Key decisions
- Money is stored as integer pence.
- Quotes are immutable snapshots. Versions, their line items and acceptances cannot be changed or deleted, even by the database owner.
- Customer-facing text never includes the owner's email address. Enquiries are delivered server-side.
- No feature assumes a credential exists. Missing credentials make the feature report that it is not connected.
- The site's CSS is kept rather than migrated to Tailwind, to keep the design intact.

## Known gaps
- The server-side paths (quote storage, enquiry saving, file transfer, agent records) run only once the Supabase secret key is set in Vercel. Production has the key; these paths have not been exercised end to end on the live database.
- Stripe, the xAI (Grok) model, and GitHub access for client repositories are not connected.
