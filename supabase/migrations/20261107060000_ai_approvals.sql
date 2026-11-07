-- Owner approvals for high-risk agent actions (Phase 4h). A task that asks for a high-risk tool pauses and
-- records one pending approval. An owner or admin approves or rejects it through the server. Approving allows
-- that tool for that task only, and re-queues the task. Staff can read; nothing is writable from the browser.

alter table public.ai_tasks add column approved_tools text[] not null default '{}';

create table public.ai_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.ai_tasks(id) on delete cascade,
  tool text not null check (char_length(tool) between 1 and 80),
  arguments jsonb not null default '{}'::jsonb,
  reason text not null check (char_length(reason) between 1 and 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'pending') = (decided_at is null)),
  check (status = 'pending' or decided_by is not null)
);

-- One open request per task and tool, so a retry cannot pile up duplicate approvals.
create unique index ai_approvals_one_pending on public.ai_approvals (task_id, tool) where status = 'pending';

alter table public.ai_approvals enable row level security;
revoke all on public.ai_approvals from anon, authenticated;
grant select on public.ai_approvals to authenticated;

create policy "staff read approvals" on public.ai_approvals for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
