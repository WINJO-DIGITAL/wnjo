-- Progress through the details form a customer fills in after paying, saved at every step so an accidental close
-- loses only the step they were on. One row per website. Only the server (service role) reads and writes it, after
-- checking the signed-in person owns the website, so browser roles get no access. It is deleted when the details
-- are sent, and it never starts the AI build: only the sent brief does that.

create table public.website_brief_progress (
  brief_id uuid primary key references public.website_briefs (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  payload jsonb not null check (pg_column_size(payload) <= 100000),
  step text not null default 'about',
  updated_at timestamptz not null default now()
);

alter table public.website_brief_progress enable row level security;
revoke all on public.website_brief_progress from anon, authenticated;
-- No policies on purpose: browser roles can't read or write progress.
