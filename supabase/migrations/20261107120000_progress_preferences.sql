-- Customer notification preferences (Phase 3j). Progress notifications now follow the customer's choices: a
-- switched-off in-app notice is not queued at all, and a switched-off email leaves the notice in-app only.

alter table public.notification_preferences drop constraint notification_preferences_kind_check;
alter table public.notification_preferences add constraint notification_preferences_kind_check
  check (kind in ('message', 'approval', 'quote', 'file', 'progress'));

create or replace function public.progress_prefs(p_user uuid, p_tenant uuid)
returns table (in_app boolean, email boolean) language sql stable security definer set search_path = '' as $$
  select coalesce((select p.in_app from public.notification_preferences p
                   where p.user_id = p_user and p.tenant_id = p_tenant and p.kind = 'progress'), true),
         coalesce((select p.email from public.notification_preferences p
                   where p.user_id = p_user and p.tenant_id = p_tenant and p.kind = 'progress'), true)
$$;

create or replace function public.notify_on_order_stage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_in_app boolean; v_email boolean;
begin
  if new.stage is distinct from old.stage and new.customer_id is not null then
    select in_app, email into v_in_app, v_email from public.progress_prefs(new.customer_id, new.tenant_id);
    if v_in_app then
      insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
      values (new.tenant_id, new.customer_id, 'progress',
              'Your website is now: ' || public.stage_label(new.stage),
              'Progress on ' || new.business_name || ' has moved on. Open your account to see the details.',
              '/account', 'stage:' || new.id::text || ':' || new.stage, v_email)
      on conflict (recipient_user_id, dedupe_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_order_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_tenant uuid; v_name text; v_in_app boolean; v_email boolean;
begin
  select o.customer_id, o.tenant_id, o.business_name into v_customer, v_tenant, v_name
  from public.orders o where o.id = new.order_id;
  if v_customer is not null then
    select in_app, email into v_in_app, v_email from public.progress_prefs(v_customer, v_tenant);
    if v_in_app then
      insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
      values (v_tenant, v_customer, 'progress', 'Update on ' || v_name, left(new.message, 300), '/account',
              'update:' || new.id::text, v_email)
      on conflict (recipient_user_id, dedupe_key) do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.progress_prefs(uuid, uuid) from public, anon, authenticated;
