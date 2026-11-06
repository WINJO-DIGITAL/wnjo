-- Corrects decide_approval: the table alias must not share a name with the PL/pgSQL variable.
create or replace function public.decide_approval(p_request_id uuid, p_decision text, p_comment text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  req record;
  v_email text;
  v_comment text := btrim(coalesce(p_comment, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'You need to be signed in to respond' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'request_changes') then
    raise exception 'Choose approve or request changes' using errcode = '22023';
  end if;
  if p_decision = 'request_changes' and char_length(v_comment) < 3 then
    raise exception 'Please tell us what you would like changed' using errcode = '22023';
  end if;
  select ar.id, ar.tenant_id, ar.status, p.organization_id
    into req
  from public.approval_requests ar
  join public.projects p on p.id = ar.project_id
  where ar.id = p_request_id
  for update of ar;
  if not found or req.organization_id is null or not public.is_org_member(req.organization_id) then
    raise exception 'That approval could not be found' using errcode = 'P0002';
  end if;
  if req.status <> 'open' then
    raise exception 'This approval has already been answered' using errcode = '22023';
  end if;
  select email into v_email from auth.users where id = v_uid;

  insert into public.approval_responses (tenant_id, approval_request_id, responder_user_id, responder_email, decision, comment)
  values (req.tenant_id, req.id, v_uid, coalesce(v_email, ''), p_decision, v_comment)
  returning id into v_id;

  update public.approval_requests
  set status = case when p_decision = 'approve' then 'approved' else 'changes_requested' end,
      decided_at = now()
  where id = req.id;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity, entity_id, metadata)
  values (req.tenant_id, v_uid, 'approval.' || p_decision, 'approval_requests', req.id::text,
    jsonb_build_object('response_id', v_id));
  return v_id;
end;
$$;

revoke execute on function public.decide_approval(uuid, text, text) from public, anon;
grant execute on function public.decide_approval(uuid, text, text) to authenticated;
