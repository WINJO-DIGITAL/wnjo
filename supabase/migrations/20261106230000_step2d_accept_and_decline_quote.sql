-- Customer acceptance and decline of a quote version. These run inside the database so every rule is
-- enforced in one place, whatever the caller. The caller must be signed in and a member of the client
-- organisation the quote was issued to. Only the latest version of a quote, while it is still open
-- and unexpired, can be accepted.

create or replace function public.accept_quote(
  p_version_id uuid,
  p_accepted_name text,
  p_terms_version text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v record;
  q record;
  v_email text;
  v_name text := btrim(coalesce(p_accepted_name, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'You need to be signed in to accept a quote' using errcode = '42501';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 200 then
    raise exception 'Please enter your full name' using errcode = '22023';
  end if;
  if p_terms_version is null or char_length(p_terms_version) = 0 then
    raise exception 'The terms version is required' using errcode = '22023';
  end if;

  select * into v from public.quote_versions where id = p_version_id;
  if not found then
    raise exception 'That quote could not be found' using errcode = 'P0002';
  end if;
  select * into q from public.quotes where id = v.quote_id for update;

  -- Only the client organisation the quote was issued to may accept it.
  if q.organization_id is null or not public.is_org_member(q.organization_id) then
    raise exception 'That quote could not be found' using errcode = 'P0002';
  end if;
  if v.version <> q.latest_version then
    raise exception 'This quote has been revised. Please review the latest version.' using errcode = '22023';
  end if;
  if q.status <> 'sent' then
    raise exception 'This quote is no longer open for acceptance' using errcode = '22023';
  end if;
  if q.expires_at is not null and q.expires_at <= now() then
    raise exception 'This quote has expired. Please ask us for an updated quote.' using errcode = '22023';
  end if;
  if exists (select 1 from public.quote_acceptances a where a.quote_version_id = v.id) then
    raise exception 'This quote has already been accepted' using errcode = '22023';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.quote_acceptances (tenant_id, quote_id, quote_version_id, accepted_by, accepted_name,
    accepted_email, user_agent, terms_version)
  values (q.tenant_id, q.id, v.id, v_uid, v_name, coalesce(v_email, ''), left(p_user_agent, 400), p_terms_version)
  returning id into v_id;

  update public.quotes set status = 'accepted', updated_at = now() where id = q.id;
  insert into public.audit_logs (tenant_id, actor_user_id, action, entity, entity_id, metadata)
  values (q.tenant_id, v_uid, 'quote.accepted', 'quotes', q.id::text,
    jsonb_build_object('version', v.version, 'acceptance_id', v_id));
  return v_id;
end;
$$;

create or replace function public.decline_quote(p_version_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v record;
  q record;
begin
  if v_uid is null then
    raise exception 'You need to be signed in to decline a quote' using errcode = '42501';
  end if;
  select * into v from public.quote_versions where id = p_version_id;
  if not found then
    raise exception 'That quote could not be found' using errcode = 'P0002';
  end if;
  select * into q from public.quotes where id = v.quote_id for update;
  if q.organization_id is null or not public.is_org_member(q.organization_id) then
    raise exception 'That quote could not be found' using errcode = 'P0002';
  end if;
  if v.version <> q.latest_version or q.status <> 'sent' then
    raise exception 'This quote is no longer open' using errcode = '22023';
  end if;
  update public.quotes set status = 'declined', updated_at = now() where id = q.id;
  insert into public.audit_logs (tenant_id, actor_user_id, action, entity, entity_id, metadata)
  values (q.tenant_id, v_uid, 'quote.declined', 'quotes', q.id::text,
    jsonb_build_object('version', v.version, 'reason', left(coalesce(p_reason, ''), 500)));
end;
$$;

revoke execute on function public.accept_quote(uuid, text, text, text) from public, anon;
revoke execute on function public.decline_quote(uuid, text) from public, anon;
grant execute on function public.accept_quote(uuid, text, text, text) to authenticated;
grant execute on function public.decline_quote(uuid, text) to authenticated;
