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

### RESOLVED: internal project fields hidden from clients
- Applied `20261106260400`: the API can no longer read a project's internal `status` and `priority`. Clients read only the customer-safe columns. Tested in `supabase/tests/project_columns.sql` (3 checks, passing).
- Decision (owner): leave the unused `status` and `priority` columns on `projects` for now. They are hidden from clients. Revisit once the internal `project_internal` table is built; dropping the columns is destructive and needs explicit confirmation at that point.

### 3e. Staff project management — built; database rules tested
- `/admin` → Projects: list projects, set the client-visible status and target date, start conversations, reply (customer-visible or internal note), request approvals, update revision-request status, and see file records.
- Database rules: `supabase/tests/staff_projects.sql`, 4 checks passing. Staff can't move a project to another client, and can't create projects from the browser.
- Limitations: staff can't see or edit the internal project status or priority (not readable through the API yet); file upload and download wait for the server key; the screens haven't been exercised signed in, since that needs a staff sign-in link.

### Still to build in Phase 3
- Staff: project and message management screens, with internal notes.
- Upload and download screens (signed URLs, need the server key), the notification list and email sender, invoices and payments (Stripe), staff screens for approvals, revisions, files and notifications.

## Phase 4: AI orchestration — core built and tested; live provider blocked

### 4a. Core engine — built and tested (no credentials needed)
- Database (migration `20261106270000`): `ai_agents`, `ai_permissions`, `ai_tasks`, `ai_runs`, `ai_tool_calls`, `ai_budget_settings`. Staff can read them; nobody can write them from the browser, so agents can't grant themselves permissions or change their own task status. Clients see nothing. Tested in `supabase/tests/ai_access.sql` (6 checks).
- Code in `src/lib/ai/`:
  - `provider.ts`: the model-provider interface. Grok (xAI) will be one implementation of it.
  - `tools.ts`: the tool registry. Tools are registered by name, and each one declares whether it is high-risk.
  - `policy.ts`: permission and budget decisions. Denies by default; high-risk tools need an owner approval; disabled or paused agents do nothing.
  - `runner.ts`: runs one task with bounded attempts, bounded model calls per attempt, a spend limit, and no retry for authentication or invalid-response errors. A runaway tool loop fails the task at once rather than retrying.
- Tests: `src/lib/ai/engine.test.ts`, 15 checks, all passing. They use a scripted provider and an in-memory store.

### 4b. Provider, budgets and storage — built, tested against fakes
- `src/lib/ai/xai.ts`: the Grok provider, using the chat-completions format with function tools. The model name and prices must be configured (`XAI_API_KEY`, `XAI_MODEL`, `XAI_INPUT_PENCE_PER_MILLION_TOKENS`, `XAI_OUTPUT_PENCE_PER_MILLION_TOKENS`); nothing is assumed. Errors are classified as authentication, transient or invalid. **Not verified against the live xAI API**: the request shape follows the common chat-completions format and needs a live check once the key is available.
- `src/lib/ai/budget.ts`: the budget gate. Checks task, agent, project and global limits together, stops at the first limit that would be exceeded, and warns at each warning threshold. 4 tests.
- `src/lib/ai/store.ts`: the database-backed run store, using the server's secret key. Tested against a fake client only; not yet run against the live database.
- The runner now waits between transient retries (exponential, up to 30 seconds). Tests use no delay.
- Tests: 34 AI tests in total, all passing.

### Not yet built in Phase 4
- Wiring the budget gate into the runner, and reading `ai_budget_settings` (currently read by nothing).
- Running the real store and the live provider end to end. This needs the server key and the xAI key.
- The approval queue screens.
- Event triggers (the event-driven queue), the five agents' instructions, and the morning briefing.
- Known limitation: if the store itself fails while a task is running, the task is left in `running` and nothing sweeps it yet. A recovery job is still to be built.

### 4c. Agent set-up and staff AI view — built
- Migration `20261106270100`: the five agents for WNJO, all switched off, and a global AI budget of £0. Verified in the database: 5 agents, 0 enabled.
- `/admin` → AI: a read-only view of the agents and their switches, recent tasks, and the budget. No controls yet; switching agents on and changing budgets come with the approval screens.
- Not yet wired: the budget gate is not connected to the runner, and nothing reads the budget to block spending. This is safe while every agent is switched off and the budget is £0, but must be wired before anything is switched on.

### 4d. Morning briefing (deterministic part) — built, tested
- `src/lib/briefing.ts`: 07:30 Europe/London scheduling that handles the clock changes (6 tests), and a briefing builder that keeps facts and suggested priorities in separate lists, linked to projects (tested).
- Migration `20261106280000`: `ai_reports` table, staff read-only. The AI tab shows the latest briefing, or when the next one is due.
- Not yet built: the server job that gathers the facts from the database and writes the report each morning. It needs the server key, and the scheduling mechanism still needs choosing.
- Not AI-written yet: the wording is fixed and comes from the facts. Grok can add prose later, once enabled.
