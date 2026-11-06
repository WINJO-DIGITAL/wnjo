# Implementation status

Live tracker for the platform brief. Each step is only marked done once it has been built, tested and committed.

## Step 1: Multi-tenant foundation (database) — done, tested

- Tables: `tenants`, `tenant_settings`, `tenant_billing_settings`, `tenant_subscriptions` (inactive), `tenant_domains`, `profiles`, `tenant_members`, `user_roles`, `organizations`, `organization_members`, `addresses`, `audit_logs`.
- The agency is provisioned as tenant `wnjo`. `orders`, `order_updates` and `enquiries` are now tenant-scoped.
- Row Level Security is enabled on every table. Browser roles have read-only access, and only where a policy allows it. All writes go through the server.
- Migrations: `supabase/migrations/` (applied in filename order).
- Tests: `supabase/tests/isolation.sql`. 19 checks, all passing at the time of writing. The script rolls back its own rows.

**Known accepted item:** the Supabase security advisor reports that signed-in users can call the three access-check functions (`is_tenant_member`, `is_org_member`, `is_platform_admin`). Each one only answers about the caller's own memberships, and the policies need them. Moving them to a private schema is a later hardening task.

**Not yet built in Step 1:** the frontend for staff and the team-membership admin screens (Step 2), and the server helpers that read the signed-in person's role.

## Decisions taken in Step 1

- Keep the existing site CSS rather than moving to Tailwind, to keep the design intact.
- Platform-level roles (`user_roles`) are separate from agency roles (`tenant_members`), so an agency member can't alter platform permissions.
- No automatic profile creation on sign-up yet. The app will create profile rows when they're first needed.
- No staff-granting function yet. Staff will be added through a server action with an audit entry, in Step 2.

## Step 2: Agency business system — in progress

Built in sub-steps, each tested before the next.

### 2a. Pricing catalogue — done, tested
- Tables: `pricing_packages`, `pricing_features`, `pricing_rates`, `pricing_care_plans`, `pricing_settings`. All amounts are integer pence.
- Seeded with WNJO's current provisional prices. Owners and admins edit them through row-level-security policies; staff can read them.
- Migrations: `20261106220000` to `20261106220300`.

### 2b. Quotes and immutable snapshots — done, tested
- Tables: `quotes`, `quote_versions` (the frozen answers, catalogue and result), `quote_version_items`, `quote_acceptances`.
- Versions, items and acceptances can't be changed or deleted, even by the database owner (a trigger enforces this).
- A quote is visible to agency staff and to the client organisation it was issued to.
- Tests: `supabase/tests/quotes.sql`, 11 checks, all passing.

### 2c. Server quote engine — done, tested
- `src/lib/quote-engine.ts` prices an enquiry from a catalogue passed in as data. It doesn't read the database itself.
- Parity test (`src/lib/quote-engine.test.ts`): the engine matches the current calculator exactly on more than 10,000 combinations of answers, including package, total, range, care price, scope flags and line items.
- The browser configurator still uses the old `estimate()` in `src/lib/pricing.ts`. Switching it to the server engine is part of 2d, so the two can't disagree for long.

### Still to build in Step 2
- 2d: quote screens for customers and staff, including acceptance with recorded evidence.
- Orders, contracts and project creation after acceptance.
- Stripe deposits and payment schedules (blocked on Stripe test-mode keys).
- Staff admin screens for prices and team membership.
