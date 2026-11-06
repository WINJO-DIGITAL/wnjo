-- Notifications (Phase 3d). Events create one notification per recipient, once, using a dedupe key, so a
-- retried event never produces a second one. Recipients can opt out per kind. Email delivery is handled
-- by the server from this outbox (sent_at is set after delivery), not by the database.

create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('message', 'approval', 'quote', 'file')),
  in_app boolean not null default true,
  email boolean not null default true,
  primary key (user_id, tenant_id, kind)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('message', 'approval', 'quote', 'file')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 500),
  link text check (link is null or link like '/%'),
  dedupe_key text not null,
  email_wanted boolean not null default false,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_user_id, dedupe_key)
);
create index notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke delete on public.notification_preferences from authenticated;

create policy "own preferences" on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own notifications" on public.notifications for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy "mark own notifications read" on public.notifications for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

-- Creates a notification for each client member of a project's organisation, unless they opted out.
create or replace function public.notify_project_clients(
  p_project_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_link text,
  p_dedupe_prefix text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_org uuid;
  v_count integer := 0;
  m record;
  pref_in_app boolean;
  pref_email boolean;
begin
  select tenant_id, organization_id into v_tenant, v_org from public.projects where id = p_project_id;
  if v_org is null then
    return 0;
  end if;
  for m in select user_id from public.organization_members where organization_id = v_org loop
    select p.in_app, p.email into pref_in_app, pref_email
    from (select 1) s left join public.notification_preferences p
      on p.user_id = m.user_id and p.tenant_id = v_tenant and p.kind = p_kind;
    if coalesce(pref_in_app, true) then
      insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
      values (v_tenant, m.user_id, p_kind, p_title, left(p_body, 500), p_link,
              p_dedupe_prefix || ':' || m.user_id::text, coalesce(pref_email, true))
      on conflict (recipient_user_id, dedupe_key) do nothing;
      if found then
        v_count := v_count + 1;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.notify_project_clients(uuid, text, text, text, text, text) from public, anon, authenticated;

-- Staff messages to the client, and approval requests, notify the client organisation.
create or replace function public.notify_on_staff_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_project uuid;
begin
  if new.sender_kind = 'staff' and new.is_internal = false then
    select c.project_id into v_project from public.conversations c where c.id = new.conversation_id;
    perform public.notify_project_clients(v_project, 'message', 'New message from WNJO',
      left(new.body, 200), '/account', 'message:' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_on_staff_message();

create or replace function public.notify_on_approval_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify_project_clients(new.project_id, 'approval', 'Approval needed: ' || new.title,
    'Please review and approve or ask for changes.', '/account', 'approval:' || new.id::text);
  return new;
end;
$$;
create trigger approval_requests_notify after insert on public.approval_requests
  for each row execute function public.notify_on_approval_request();

create or replace function public.notify_on_quote_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  select q.organization_id into v_org from public.quotes q where q.id = new.quote_id;
  if v_org is not null then
    insert into public.notifications (tenant_id, recipient_user_id, kind, title, body, link, dedupe_key, email_wanted)
    select new.tenant_id, m.user_id, 'quote', 'Your quote is ready', 'Please review and accept or decline it.', '/account',
           'quote:' || new.id::text || ':' || m.user_id::text, true
    from public.organization_members m where m.organization_id = v_org
    on conflict (recipient_user_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;
create trigger quote_versions_notify after insert on public.quote_versions
  for each row execute function public.notify_on_quote_version();
