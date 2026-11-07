-- Customer email attempts (Phase 3j). A notification whose email keeps failing is retried a few times, then
-- left alone, so one bad address cannot block the queue behind it.

alter table public.notifications add column email_attempts integer not null default 0 check (email_attempts >= 0);
