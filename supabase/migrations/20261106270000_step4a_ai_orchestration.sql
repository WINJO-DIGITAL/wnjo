-- AI orchestration core (Phase 4). Agents do work only through server-side tools that check permissions,
-- budgets and approvals. The browser can read this record; only the server writes it.

create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_key text not null check (agent_key in ('project_manager', 'developer', 'qa_engineer', 'client_success', 'operations_manager')),
  name text not null check (char_length(name) between 1 and 80),
  enabled boolean not null default true,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, agent_key)
);

-- Which tools each agent may use. Anything not listed here is denied.
create table public.ai_permissions (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_key text not null,
  tool text not null check (char_length(tool) between 1 and 80),
  allowed boolean not null default true,
  primary key (tenant_id, agent_key, tool)
);

create table public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agent_key text not null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'suspended', 'awaiting_approval')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  budget_pence integer not null default 500 check (budget_pence >= 0),
  spent_pence integer not null default 0 check (spent_pence >= 0),
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key)
);
create index ai_tasks_tenant_status_idx on public.ai_tasks (tenant_id, status);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.ai_tasks(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  provider text not null,
  model text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'stopped')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_pence integer not null default 0 check (cost_pence >= 0),
  error text check (error is null or char_length(error) <= 1000),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index ai_runs_task_idx on public.ai_runs (task_id, attempt);

create table public.ai_tool_calls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  run_id uuid not null references public.ai_runs(id) on delete cascade,
  tool text not null,
  allowed boolean not null,
  denial_reason text check (denial_reason is null or char_length(denial_reason) <= 300),
  arguments jsonb not null default '{}'::jsonb,
  result_summary text check (result_summary is null or char_length(result_summary) <= 1000),
  created_at timestamptz not null default now()
);

-- Spending limits. Scope is 'global' (scope_id null), 'agent' (agent key) or 'project' (project id).
create table public.ai_budget_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  scope text not null check (scope in ('global', 'agent', 'project')),
  scope_id text,
  monthly_limit_pence integer not null check (monthly_limit_pence >= 0),
  warn_at_pence integer not null check (warn_at_pence >= 0),
  constraint ai_budget_scope_id check ((scope = 'global') = (scope_id is null)),
  unique (tenant_id, scope, scope_id)
);

-- Read access for agency staff. Nothing is writable from the browser: the server records all of this.
alter table public.ai_agents enable row level security;
alter table public.ai_permissions enable row level security;
alter table public.ai_tasks enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_tool_calls enable row level security;
alter table public.ai_budget_settings enable row level security;

revoke all on public.ai_agents, public.ai_permissions, public.ai_tasks, public.ai_runs,
  public.ai_tool_calls, public.ai_budget_settings from anon, authenticated;
grant select on public.ai_agents, public.ai_permissions, public.ai_tasks, public.ai_runs,
  public.ai_tool_calls, public.ai_budget_settings to authenticated;

create policy "staff read agents" on public.ai_agents for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff read permissions" on public.ai_permissions for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff read tasks" on public.ai_tasks for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff read runs" on public.ai_runs for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "staff read tool calls" on public.ai_tool_calls for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
create policy "admins read budgets" on public.ai_budget_settings for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin']));

-- Owners and admins change budgets (through the server). Agents never change their own permissions.
-- Writes are server-only; no write policies are granted to browser roles.
