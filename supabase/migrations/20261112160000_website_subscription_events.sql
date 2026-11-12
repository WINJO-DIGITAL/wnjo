-- A permanent log of what happened to a website subscription: a cancellation asked for, withdrawn, a subscription
-- ending, and a failed payment. Stripe is the source of truth; this is the history we show staff. Rows are only ever
-- added, never changed. Each Stripe event is recorded once (stripe_event_id is unique), so a retried webhook can't
-- double-count. Only the server (service role) writes it; staff can read it.

create table public.website_subscription_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subscription_id uuid not null references public.website_subscriptions (id) on delete cascade,
  kind text not null check (kind in ('cancel_requested', 'cancel_withdrawn', 'ended', 'payment_failed')),
  reason text not null default '',
  stripe_event_id text not null unique,
  created_at timestamptz not null default now()
);

create index website_subscription_events_sub on public.website_subscription_events (subscription_id, created_at desc);
create index website_subscription_events_kind on public.website_subscription_events (kind, created_at desc);

alter table public.website_subscription_events enable row level security;

create policy "staff read website subscription events" on public.website_subscription_events for select
  using (is_tenant_member(tenant_id, array['owner', 'admin', 'staff']));
revoke insert, update, delete on public.website_subscription_events from authenticated;
