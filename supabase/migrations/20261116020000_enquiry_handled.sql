-- Staff can mark an enquiry as dealt with, so the list and the overview show only what still needs an answer.
-- Additive. Staff already have an update policy on enquiries; only these two columns are opened to it.
alter table public.enquiries add column if not exists handled_at timestamptz;
alter table public.enquiries add column if not exists handled_by uuid references auth.users (id);
grant update (handled_at, handled_by) on public.enquiries to authenticated;
create index if not exists enquiries_open_idx on public.enquiries (tenant_id, created_at desc) where handled_at is null;
