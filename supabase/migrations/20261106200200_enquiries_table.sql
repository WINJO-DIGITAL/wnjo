create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('contact', 'brief')),
  name text not null,
  email text not null,
  company text,
  topic text,
  budget text,
  timeline text,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.enquiries enable row level security;

-- No policies: nothing can read or write this table from the browser. The website's
-- server writes enquiries with its secret key, which bypasses row-level security.
revoke all on public.enquiries from anon, authenticated;
