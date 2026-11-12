-- Cancellation requests made by customers on their account, and renewal reminders. A customer asks to cancel and the
-- request is recorded at once, so there is a clear time they asked; staff then process it. There can be only one open
-- request per subscription. Only the server (service role) writes these tables; staff can read them. The subscription
-- events log also learns about renewal reminders, which are sent before a plan's minimum term ends and every six
-- months after, and recorded once each.

create table public.website_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subscription_id uuid not null references public.website_subscriptions (id) on delete cascade,
  reason text not null default '',
  status text not null default 'open' check (status in ('open', 'processed', 'withdrawn')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index website_cancellation_requests_one_open on public.website_cancellation_requests (subscription_id) where status = 'open';
create index website_cancellation_requests_tenant on public.website_cancellation_requests (tenant_id, status, created_at desc);

alter table public.website_cancellation_requests enable row level security;

create policy "staff read website cancellation requests" on public.website_cancellation_requests for select
  using (is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
revoke insert, update, delete on public.website_cancellation_requests from authenticated;

alter table public.website_subscription_events drop constraint if exists website_subscription_events_kind_check;
alter table public.website_subscription_events add constraint website_subscription_events_kind_check
  check (kind in ('cancel_requested', 'cancel_withdrawn', 'ended', 'payment_failed', 'renewal_reminder'));
