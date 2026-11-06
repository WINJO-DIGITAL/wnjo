create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  project_type text not null,
  stage text not null default 'brief_received'
    check (stage in ('brief_received', 'designing', 'building', 'reviewing', 'live')),
  stage_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.order_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index order_updates_order_id_idx on public.order_updates (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_updates enable row level security;

create policy "customers read own orders"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

create policy "customers read updates on own orders"
  on public.order_updates for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_updates.order_id and o.customer_id = auth.uid()
    )
  );

revoke all on public.orders from anon;
revoke all on public.order_updates from anon;
