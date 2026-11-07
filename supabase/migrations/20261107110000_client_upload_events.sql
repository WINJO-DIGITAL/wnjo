-- A client's file upload raises an AI event (Phase 4j), keyed to the file so a retry adds nothing.
create or replace function public.emit_client_upload()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.uploaded_by_kind = 'client' and new.is_internal = false then
    perform public.emit_ai_event(new.tenant_id, 'client_uploaded_files', new.project_id, 'client_files:' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger project_files_emit_ai_event after insert on public.project_files
  for each row execute function public.emit_client_upload();
revoke execute on function public.emit_client_upload() from public, anon, authenticated;
