-- Audit round four: database performance advisor fixes.
-- 1. Index every foreign key that has no covering index (39 of them), so joins and cascading deletes on these
--    columns don't scan whole tables as data grows. "if not exists" makes this safe to re-run.
-- 2. Evaluate auth.uid() once per query, not once per row, in the two customer order policies.
-- Unused-index and multiple-permissive-policy notices are left as they are: the indexes have simply not been
-- needed yet with little traffic, and the overlapping policies are the deliberate staff/client split.

create index if not exists addresses_organization_id_fk_idx on public.addresses (organization_id);
create index if not exists addresses_user_id_fk_idx on public.addresses (user_id);
create index if not exists ai_approvals_decided_by_fk_idx on public.ai_approvals (decided_by);
create index if not exists ai_approvals_tenant_id_fk_idx on public.ai_approvals (tenant_id);
create index if not exists ai_events_project_id_fk_idx on public.ai_events (project_id);
create index if not exists ai_runs_tenant_id_fk_idx on public.ai_runs (tenant_id);
create index if not exists ai_tasks_project_id_fk_idx on public.ai_tasks (project_id);
create index if not exists ai_tool_calls_run_id_fk_idx on public.ai_tool_calls (run_id);
create index if not exists ai_tool_calls_tenant_id_fk_idx on public.ai_tool_calls (tenant_id);
create index if not exists approval_requests_requested_by_fk_idx on public.approval_requests (requested_by);
create index if not exists approval_requests_tenant_id_fk_idx on public.approval_requests (tenant_id);
create index if not exists approval_responses_responder_user_id_fk_idx on public.approval_responses (responder_user_id);
create index if not exists approval_responses_tenant_id_fk_idx on public.approval_responses (tenant_id);
create index if not exists audit_logs_actor_user_id_fk_idx on public.audit_logs (actor_user_id);
create index if not exists client_invites_claimed_by_fk_idx on public.client_invites (claimed_by);
create index if not exists client_invites_created_by_fk_idx on public.client_invites (created_by);
create index if not exists client_invites_order_id_fk_idx on public.client_invites (order_id);
create index if not exists client_invites_organization_id_fk_idx on public.client_invites (organization_id);
create index if not exists conversations_tenant_id_fk_idx on public.conversations (tenant_id);
create index if not exists deposits_tenant_id_fk_idx on public.deposits (tenant_id);
create index if not exists messages_sender_user_id_fk_idx on public.messages (sender_user_id);
create index if not exists messages_tenant_id_fk_idx on public.messages (tenant_id);
create index if not exists notification_preferences_tenant_id_fk_idx on public.notification_preferences (tenant_id);
create index if not exists notifications_tenant_id_fk_idx on public.notifications (tenant_id);
create index if not exists organization_invites_claimed_by_fk_idx on public.organization_invites (claimed_by);
create index if not exists organization_invites_created_by_fk_idx on public.organization_invites (created_by);
create index if not exists organization_invites_tenant_id_fk_idx on public.organization_invites (tenant_id);
create index if not exists organizations_created_by_fk_idx on public.organizations (created_by);
create index if not exists project_files_tenant_id_fk_idx on public.project_files (tenant_id);
create index if not exists project_files_uploaded_by_fk_idx on public.project_files (uploaded_by);
create index if not exists projects_order_id_fk_idx on public.projects (order_id);
create index if not exists quote_acceptances_accepted_by_fk_idx on public.quote_acceptances (accepted_by);
create index if not exists quote_acceptances_quote_id_fk_idx on public.quote_acceptances (quote_id);
create index if not exists quote_acceptances_tenant_id_fk_idx on public.quote_acceptances (tenant_id);
create index if not exists quote_version_items_tenant_id_fk_idx on public.quote_version_items (tenant_id);
create index if not exists quote_versions_created_by_fk_idx on public.quote_versions (created_by);
create index if not exists quotes_enquiry_id_fk_idx on public.quotes (enquiry_id);
create index if not exists revision_requests_approval_request_id_fk_idx on public.revision_requests (approval_request_id);
create index if not exists revision_requests_tenant_id_fk_idx on public.revision_requests (tenant_id);

alter policy "customers read own orders" on public.orders
  using (customer_id = (select auth.uid()));

alter policy "customers read updates on own orders" on public.order_updates
  using (exists (select 1 from public.orders o where o.id = order_updates.order_id and o.customer_id = (select auth.uid())));
