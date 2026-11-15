-- The addresses a customer's live website is served on. Staff attach an address to a website; the public site shows it
-- only while the website's brief is at the "live" stage (which the database only allows after all four approvals) and
-- it has a released build. Only the server reads and writes this (with the service role), so row-level security is on
-- with no policies.
create table if not exists public.site_domains (
  hostname text primary key check (hostname = lower(hostname) and char_length(hostname) between 4 and 253),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brief_id uuid not null references public.website_briefs (id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists site_domains_brief_idx on public.site_domains (brief_id);

alter table public.site_domains enable row level security;
