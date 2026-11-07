-- Shared rate limiting (audit round four). The in-memory limiter only counts requests on one server instance, so on
-- a serverless platform it barely slows abuse. This keeps a short log of hits per key in the database, which every
-- instance shares. Keys are hashed by the server before they arrive here (no raw IP addresses are stored), and rows
-- older than a day are cleared. Only the server's service role can use it.

create table public.rate_limit_hits (
  key text not null,
  hit_at timestamptz not null default now()
);
create index rate_limit_hits_key_time_idx on public.rate_limit_hits (key, hit_at desc);
alter table public.rate_limit_hits enable row level security;
-- No policies: nobody but the service role (which bypasses row-level security) reads or writes this table.
revoke all on public.rate_limit_hits from anon, authenticated;

-- Records a hit for p_key and returns true when the key had already reached p_max hits in the last p_window_seconds.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_key is null or char_length(p_key) = 0 or char_length(p_key) > 200
     or p_max is null or p_max < 1 or p_window_seconds is null or p_window_seconds < 1 then
    return true;
  end if;
  delete from public.rate_limit_hits
    where key = p_key and hit_at < now() - make_interval(secs => p_window_seconds);
  select count(*) into v_count from public.rate_limit_hits where key = p_key;
  insert into public.rate_limit_hits (key) values (p_key);
  -- Now and then, clear keys nobody has used for a day, so the table stays small.
  if random() < 0.02 then
    delete from public.rate_limit_hits where hit_at < now() - interval '1 day';
  end if;
  return v_count >= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
