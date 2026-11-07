-- Quote follow-up (Phase 3n): one reminder for a quote that is still open after a few days. The reminder time is
-- recorded so a customer is never reminded twice. Written by the server only.
alter table public.quotes add column reminded_at timestamptz;
create index quotes_reminder_due_idx on public.quotes (created_at) where status = 'sent' and reminded_at is null;
