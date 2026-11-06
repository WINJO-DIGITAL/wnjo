-- Daily reports written by the server (currently: the morning briefing). Staff can read them; nothing is
-- writable from the browser.
create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('morning_briefing')),
  report_date date not null,
  body jsonb not null,
  generated_at timestamptz not null default now(),
  unique (tenant_id, kind, report_date)
);

alter table public.ai_reports enable row level security;
revoke all on public.ai_reports from anon, authenticated;
grant select on public.ai_reports to authenticated;

create policy "staff read reports" on public.ai_reports for select to authenticated
  using (public.is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
