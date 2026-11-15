-- Booking requests sent through a customer's template website. Saved before the email goes, so a request is never lost
-- when the email fails. Only the server writes and reads this (with the service role), so row-level security is on with
-- no policies, the same as the other server-only tables.
create table if not exists public.site_enquiries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  brief_id uuid not null references public.website_briefs (id) on delete cascade,
  build_id uuid references public.website_site_builds (id) on delete set null,
  page text not null default '',
  name text not null,
  contact text not null,
  message text not null default '',
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists site_enquiries_brief_idx on public.site_enquiries (brief_id, created_at desc);

alter table public.site_enquiries enable row level security;
