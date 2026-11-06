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
