-- Quote notices follow the customer's choices (Phase 3j). A customer who has switched off the quote notice on the
-- site gets none; one who has switched off email gets the notice on the site only.

create or replace function public.notify_on_quote_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_org uuid; m record; v_in_app boolean; v_email boolean;
begin
  select q.organization_id into v_org from public.quotes q where q.id = new.quote_id;
  if v_org is not null then
    for m in select user_id from public.organization_members where organization_id = v_org loop
      select p.in_app, p.email into v_in_app, v_email
      from (select 1) s left join public.notification_preferences p
        on p.user_id = m.user_id and p.tenant_id = new.tenant_id and p.kind = 'quote';
      if coalesce(v_in_app, true) then
        insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
        values (new.tenant_id, m.user_id, 'quote', 'Your quote is ready', 'Please review and accept or decline it.', '/account',
                'quote:' || new.id::text || ':' || m.user_id::text, coalesce(v_email, true))
        on conflict (recipient_user_id, dedupe_key) do nothing;
      end if;
    end loop;
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_on_quote_version() from public, anon, authenticated;
