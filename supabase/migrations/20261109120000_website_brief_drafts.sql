-- Server-side drafts for the "Build my website" journey, so a customer can leave and come back (on any device) with a
-- link. The draft id is a random v4 UUID made in the customer's browser; whoever holds the link can read the draft,
-- so it behaves like a magic link and is never listed or searched. Only the server (service role) reads and writes
-- this table. Drafts expire after 30 days and are deleted when the brief is sent.

create table public.website_brief_drafts (
  draft_id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payload jsonb not null check (pg_column_size(payload) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index website_brief_drafts_expires on public.website_brief_drafts (expires_at);

alter table public.website_brief_drafts enable row level security;
revoke all on public.website_brief_drafts from anon, authenticated;
-- No policies on purpose: browser roles can't read or write drafts. The server uses the service role.
