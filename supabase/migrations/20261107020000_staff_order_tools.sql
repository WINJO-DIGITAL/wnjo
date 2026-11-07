-- Staff order tools: move an order to its stage and post a dated update the customer can read.
--
-- Staff may change only the stage of an order (not its customer, name or agency), and only for orders in
-- their own agency. Updates are append-only: staff can post them but never edit or delete them.

-- Column-level grant: the existing "staff update orders" row policy still limits which rows change.
grant update (stage) on public.orders to authenticated;

-- Whenever the stage changes, record when, so the customer sees how long it has been there.
create or replace function public.orders_stage_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_updated_at := now();
  end if;
  return new;
end;
$$;

create trigger orders_stage_timestamp
  before update of stage on public.orders
  for each row execute function public.orders_stage_timestamp();

alter table public.order_updates
  add constraint order_updates_message_length check (char_length(message) between 1 and 1000);

create policy "staff post order updates" on public.order_updates
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_updates.order_id
        and public.is_tenant_member(o.tenant_id, array['owner', 'admin', 'staff'])
    )
  );

grant insert on public.order_updates to authenticated;
