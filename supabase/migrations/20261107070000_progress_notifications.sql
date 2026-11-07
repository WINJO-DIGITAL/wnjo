-- Progress notifications (Phase 3i): a customer hears when their website's stage changes or a progress update is
-- posted. The database queues one notification per change (dedupe key makes a repeat a no-op) and the server
-- sends the email from the outbox. Unclaimed orders (no customer yet) queue nothing.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('message', 'approval', 'quote', 'file', 'progress'));

create or replace function public.stage_label(p_stage text)
returns text language sql immutable set search_path = '' as $$
  select case p_stage
    when 'brief_received' then 'Brief received'
    when 'designing' then 'Designing'
    when 'building' then 'Building'
    when 'reviewing' then 'Reviewing with you'
    when 'live' then 'Live'
    else p_stage
  end
$$;

create or replace function public.notify_on_order_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.stage is distinct from old.stage and new.customer_id is not null then
    insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
    values (new.tenant_id, new.customer_id, 'progress',
            'Your website is now: ' || public.stage_label(new.stage),
            'Progress on ' || new.business_name || ' has moved on. Open your account to see the details.',
            '/account', 'stage:' || new.id::text || ':' || new.stage, true)
    on conflict (recipient_user_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger orders_notify_stage after update of stage on public.orders
  for each row execute function public.notify_on_order_stage();

create or replace function public.notify_on_order_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_tenant uuid; v_name text;
begin
  select o.customer_id, o.tenant_id, o.business_name into v_customer, v_tenant, v_name
  from public.orders o where o.id = new.order_id;
  if v_customer is not null then
    insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
    values (v_tenant, v_customer, 'progress', 'Update on ' || v_name, left(new.message, 300), '/account',
            'update:' || new.id::text, true)
    on conflict (recipient_user_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger order_updates_notify after insert on public.order_updates
  for each row execute function public.notify_on_order_update();

revoke execute on function public.stage_label(text) from public, anon, authenticated;
revoke execute on function public.notify_on_order_stage() from public, anon, authenticated;
revoke execute on function public.notify_on_order_update() from public, anon, authenticated;
