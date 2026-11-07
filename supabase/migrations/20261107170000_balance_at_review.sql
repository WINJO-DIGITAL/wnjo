-- Balance requested automatically when the site is ready for final review (Phase 3l). Industry standard for a web
-- agency: the final payment falls due before launch, once the deposit has been paid. The arithmetic matches the
-- server's (total minus the 50% deposit, rounded half up), and the client gets the same notice as a manual request.

create or replace function public.request_balance_at_review()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
  m record;
  v_deposit integer;
  v_amount integer;
  v_balance uuid;
  v_in_app boolean;
  v_email boolean;
begin
  if new.stage = 'reviewing' and old.stage is distinct from 'reviewing' then
    for r in
      select a.id as acceptance_id, a.tenant_id, q.organization_id, v.build_pence
      from public.projects p
      join public.quotes q on q.organization_id = p.organization_id
      join public.quote_acceptances a on a.quote_id = q.id
      join public.quote_versions v on v.id = a.quote_version_id
      where p.order_id = new.id
    loop
      if exists (select 1 from public.deposits d where d.quote_acceptance_id = r.acceptance_id and d.kind = 'deposit' and d.status = 'paid')
         and not exists (select 1 from public.deposits d where d.quote_acceptance_id = r.acceptance_id and d.kind = 'balance') then
        v_deposit := floor((r.build_pence * 50 + 50) / 100);
        v_amount := r.build_pence - v_deposit;
        if v_amount > 0 then
          insert into public.deposits (tenant_id, quote_acceptance_id, amount_pence, kind)
          values (r.tenant_id, r.acceptance_id, v_amount, 'balance')
          on conflict do nothing
          returning id into v_balance;
          if v_balance is not null then
            for m in select user_id from public.organization_members where organization_id = r.organization_id loop
              select p.in_app, p.email into v_in_app, v_email
              from (select 1) s left join public.notification_preferences p
                on p.user_id = m.user_id and p.tenant_id = r.tenant_id and p.kind = 'quote';
              if coalesce(v_in_app, true) then
                insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
                values (r.tenant_id, m.user_id, 'quote', 'Your final payment is ready',
                        'The balance for your website can now be paid from your account, before launch.', '/account',
                        'balance:' || v_balance::text || ':' || m.user_id::text, coalesce(v_email, true))
                on conflict (recipient_user_id, dedupe_key) do nothing;
              end if;
            end loop;
          end if;
        end if;
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create trigger orders_request_balance after update of stage on public.orders
  for each row execute function public.request_balance_at_review();

revoke execute on function public.request_balance_at_review() from public, anon, authenticated;
