-- Business events raised by the database itself (Phase 4i): a new project, and a message a client posts. They
-- are written to ai_events with a dedupe key, so a retry never creates a second event. The server plans and
-- runs the agent work when it next processes events (see the staff send route and the daily sweep).

create or replace function public.emit_ai_event(p_tenant uuid, p_type text, p_project uuid, p_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ai_events (tenant_id, event_type, project_id, dedupe_key)
  values (p_tenant, p_type, p_project, p_key)
  on conflict (tenant_id, dedupe_key) do nothing;
end;
$$;

create or replace function public.emit_project_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.emit_ai_event(new.tenant_id, 'project_created', new.id, 'project_created:' || new.id::text);
  return new;
end;
$$;
create trigger projects_emit_ai_event after insert on public.projects
  for each row execute function public.emit_project_created();

create or replace function public.emit_client_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_project uuid;
begin
  if new.sender_kind = 'client' and new.is_internal = false then
    select c.project_id into v_project from public.conversations c where c.id = new.conversation_id;
    perform public.emit_ai_event(new.tenant_id, 'client_message_received', v_project, 'client_message:' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger messages_emit_ai_event after insert on public.messages
  for each row execute function public.emit_client_message();

revoke execute on function public.emit_ai_event(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.emit_project_created() from public, anon, authenticated;
revoke execute on function public.emit_client_message() from public, anon, authenticated;
