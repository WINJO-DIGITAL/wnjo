-- The sites the staff template test writes, kept with the customer's made-up facts, so a change to the checks can be tried
-- on real model wording again without calling the model. Only the server reads and writes this (with the service role),
-- so row-level security is on with no policies.
create table if not exists public.template_test_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  template text not null,
  business text not null,
  model text not null,
  passed boolean not null,
  cost_pence numeric not null default 0,
  pages integer not null default 1,
  facts jsonb not null,
  content jsonb,
  model_lines jsonb not null default '[]'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  run_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists template_test_runs_tenant_idx on public.template_test_runs (tenant_id, created_at desc);

alter table public.template_test_runs enable row level security;
