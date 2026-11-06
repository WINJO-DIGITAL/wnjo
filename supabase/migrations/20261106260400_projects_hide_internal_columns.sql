-- Clients and staff read only the customer-safe columns of a project. The internal status and priority
-- columns stay in the table but are no longer readable through the API.
revoke select on public.projects from authenticated;
grant select (id, tenant_id, organization_id, order_id, name, customer_status, target_date, created_at, updated_at)
  on public.projects to authenticated;
