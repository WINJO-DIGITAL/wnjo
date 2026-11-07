# Database schema

All tables are in the `public` schema, have row-level security enabled, and are changed only through migrations in `supabase/migrations`. Amounts are integer pence.

| Area | Tables | Notes |
|---|---|---|
| Tenancy | `tenants`, `tenant_settings`, `tenant_billing_settings`, `tenant_subscriptions`, `tenant_domains` | Subscriptions exist but are inactive. |
| People | `profiles`, `tenant_members`, `user_roles`, `organizations`, `organization_members`, `addresses`, `audit_logs` | Agency roles are `owner`, `admin`, `staff`. Client roles are `client_owner`, `client_admin`, `client_member`. `user_roles` holds platform-level roles only. |
| Website orders | `orders`, `order_updates` | Stage changes are the only field staff can edit. |
| Enquiries | `enquiries` | Written only by the server. |
| Pricing | `pricing_packages`, `pricing_features`, `pricing_rates`, `pricing_care_plans`, `pricing_settings` | Owners and admins edit prices. Seeded with WNJO's current provisional prices. |
| Quotes | `quotes`, `quote_versions`, `quote_version_items`, `quote_acceptances` | Versions, items and acceptances are immutable (trigger). Status changes only through `accept_quote` / `decline_quote`. |
| Projects | `projects`, `conversations`, `messages` | Internal `status` and `priority` columns remain but are not readable through the API. Messages are append-only; internal notes are hidden from clients. |
| Approvals | `approval_requests`, `approval_responses`, `revision_requests` | Decisions are made only by `decide_approval`. |
| Files | `project_files` | Metadata only; objects live in the private `project-files` bucket. |
| Notifications | `notifications`, `notification_preferences` | One per recipient, unique dedupe key. |
| AI | `ai_agents`, `ai_permissions`, `ai_tasks`, `ai_runs`, `ai_tool_calls`, `ai_budget_settings`, `ai_reports` | Read-only from the browser. All five agents are seeded switched off, with a global budget of £0. |

**Not yet created:** project internal fields table (`project_internal`), finance tables (invoices, payments, payment schedules), hosting and repository tables, and the rest of the brief's schema. See `IMPLEMENTATION_STATUS.md`.

**Known accepted item:** the security advisor flags the access-check functions as callable by signed-in users. They only answer about the caller's own memberships.
