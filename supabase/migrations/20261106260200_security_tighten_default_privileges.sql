-- Supabase grants new public tables to the anon and authenticated roles by default, including
-- TRUNCATE (which bypasses row-level security). Remove those, and narrow the tables that need it.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;

-- Notifications: clients can only mark their own as read. Everything else is server-written.
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Approval responses are written only by decide_approval.
revoke insert, update, delete on public.approval_responses from authenticated;

-- Approvals: staff create; the decision columns change only through decide_approval (security definer).
revoke update, delete on public.approval_requests from authenticated;
grant update (status, decided_at) on public.approval_requests to authenticated;

-- Revision requests: clients create; staff change the status.
revoke update, delete on public.revision_requests from authenticated;
grant update (status) on public.revision_requests to authenticated;

-- Projects: staff change only the customer-safe fields (never organisation or tenant).
revoke update on public.projects from authenticated;
grant update (name, customer_status, target_date, updated_at) on public.projects to authenticated;
