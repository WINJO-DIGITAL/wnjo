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

### 2d. Quote acceptance and staff view — built, partly verified
- Database: `accept_quote` and `decline_quote` (signed-in client, own organisation, latest open unexpired version only; the name is trimmed and checked; the signed-in email is recorded). `store_quote` writes a quote, its version and items atomically, and only the server's secret key can call it.
- Tests: `supabase/tests/acceptance.sql` (12 checks) and `supabase/tests/store_quote.sql` (4 checks). All passing.
- Customer: "Your quotes" panel on `/account` shows the latest version, the breakdown, scope notes, and accept and decline buttons. Built and type-checked. Not yet tested signed in, since that needs a sign-in link.
- Staff: `/admin` shows enquiries, quotes and orders, limited by row-level security, with a refusal for anyone without an agency role. Built. Not yet tested signed in.
- Server: `src/lib/quote-store.ts` loads prices from the database and creates quotes. **Blocked**: it needs `SUPABASE_SERVICE_ROLE_KEY`. Its pure parts (catalogue mapping, record building) are unit-tested, 44 tests across the suite.
- Not built yet: the quote-creation screen. The configurator still uses the browser estimate, and switching it is blocked on the same key.

### Still to build in Step 2
- Orders and project creation after payment (needs Stripe).
- Stripe deposits and payment schedules (blocked on Stripe test-mode keys).
- Staff screens for editing prices and team members.
- Switching the configurator to the server engine (needs the service key).

## Phase 3: Project and client portals — in progress

### 3a. Projects and messages — database built and tested; client screens built
- Applied: `projects`, `conversations`, `messages` (migration `20261106240000`). Messages are append-only for everyone. Internal notes (`is_internal`) are invisible to clients, enforced by row-level security. Clients can post only customer-visible messages, as themselves, into their own organisation's projects. System messages can only be written by the server.
- Tests: `supabase/tests/messages.sql`, 15 checks, all passing.
- Client screen: "Your projects" on `/account` shows each project's customer status, target date and message thread, with a form to send a message. Built, type-checked, built for production. Not yet tested signed in.

### 3b. Approvals and revision requests — database built and tested; client screens built
- Applied: `approval_requests`, `approval_responses`, `revision_requests`, and `decide_approval` (migrations `20261106250000` and `20261106250100`, the latter fixing a variable-name clash).
- Staff create approval requests. Clients approve, or request changes with a written reason, once per request. Each decision records the signed-in email and writes an audit entry. Clients can ask for revisions on their own project, but cannot change their status.
- Tests: `supabase/tests/approvals.sql`, 16 checks, all passing.
- Client screen: approvals appear under each project on `/account`, with approve and request-changes controls. Built and type-checked; not yet tested signed in.
- Not yet built: staff screens to create approvals and handle revision requests.

### 3c. Project files — database built and tested
- Applied: `project_files` metadata and a private `project-files` bucket (migration `20261106260000`).
- Tests: `supabase/tests/files.sql`, 9 checks, all passing.
- Not built: upload and download screens. Both need server-issued signed URLs, which need the server key.

### 3d. Notifications — database built and tested
- Applied: `notification_preferences`, `notifications` (one per recipient, unique dedupe key, so replays never duplicate), and triggers for staff messages, approval requests and new quotes (migration `20261106260100`).
- Clients see only their own notifications, can mark them read, and can't change their content.
- Tests: `supabase/tests/notifications.sql`, 11 checks, all passing.
- Not built: the in-app notification list and the email sending. Email uses the `email_wanted` flag and `sent_at` column; the server sender is still to be written.

### SECURITY FIX (applied): default privileges tightened
- Finding: Supabase grants new public tables to the browser roles by default, including TRUNCATE (which bypasses row-level security) and direct writes. This had been left open on the tables created since Step 1.
- Applied in migrations `20261106260200` and `20261106260300`: TRUNCATE, REFERENCES and TRIGGER removed from browser roles; anonymous visitors have no table access; quote status can only change through the tested functions; staff can change only an order's stage; projects can't be inserted from the browser.
- Verified by a privilege audit of every public table, and the approvals suite was rerun (16 checks passing).

### BLOCKED: pending migration (not applied)
- `supabase/pending/20261106240100_step3a_split_internal_project_fields.sql` moves the internal project fields (`status`, `priority`) into a staff-only `project_internal` table, and restricts client access to customer-safe columns of `projects`.
- It was not applied: the Supabase apply tool timed out while the server was asking a question that no one answered. The database was checked afterwards and is unchanged (`projects.status` still exists, `project_internal` does not exist).
- **Exact next action:** answer or clear the pending Supabase question in the dashboard, then apply `supabase/pending/20261106240100_step3a_split_internal_project_fields.sql` (move it to `supabase/migrations/` once applied), then rerun `supabase/tests/messages.sql` and add a check that clients cannot read `status` or `priority`.
- **Current exposure:** until it is applied, a signed-in client could read `status` and `priority` on their own project through the API. No projects exist in the database yet, so no data is exposed today. This must be fixed before any project is created.

### Still to build in Phase 3
- Staff: project and message management screens, with internal notes.
- Upload and download screens (signed URLs, need the server key), the notification list and email sender, invoices and payments (Stripe), staff screens for approvals, revisions, files and notifications.
