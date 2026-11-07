-- Business events the agents react to (Phase 4g). The server records an event once (the dedupe key makes a
-- repeated delivery a no-op), then the worker plans and runs the agent tasks it creates. Staff can read the
-- queue; nothing is writable from the browser.

create table public.ai_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null check (event_type in (
    'deposit_paid', 'project_created', 'task_completed', 'qa_failed', 'qa_passed', 'client_uploaded_files',
    'client_message_received', 'deadline_approaching', 'website_unavailable', 'maintenance_requested',
    'morning_briefing_due'
  )),
  project_id uuid references public.projects(id) on delete set null,
  source_agent text check (source_agent in ('project_manager', 'developer', 'qa_engineer', 'client_success', 'operations_manager')),
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 200),
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (char_length(last_error) <= 300),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (tenant_id, dedupe_key),
  check ((status = 'processed') = (processed_at is not null))
);

create index ai_events_pending_idx on public.ai_events (created_at) where status = 'pending';

alter table public.ai_events enable row level security;
revoke all on public.ai_events from anon, authenticated;
grant select on public.ai_events to authenticated;

create policy "staff read events" on public.ai_events for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
