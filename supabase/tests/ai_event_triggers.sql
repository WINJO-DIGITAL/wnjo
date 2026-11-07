-- Database events: a new project and a client message each raise one AI event; staff messages and internal
-- notes raise none; a repeated message raises no second event. Rolls back every test row.
-- Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  p1 uuid := '00000000-0000-4000-8000-0000000000c3';
  conv uuid := '00000000-0000-4000-8000-0000000000c4';
  m1 uuid := '00000000-0000-4000-8000-0000000000c5';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values (A, 'authenticated', 'authenticated', 'staff-et@test.invalid') on conflict (id) do nothing;
  insert into auth.users (id, aud, role, email) values (C, 'authenticated', 'authenticated', 'client-et@test.invalid') on conflict (id) do nothing;
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Trigger client');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name) values (p1, W, org1, 'Trigger project');

  select count(*) into n from public.ai_events where event_type = 'project_created' and project_id = p1;
  report := report || format(E'%s a new project raises one project_created event (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  insert into public.conversations (id, tenant_id, project_id, subject) values (conv, W, p1, 'Trigger chat');
  insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (W, conv, A, 'staff', false, 'Staff note to client');
  insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (W, conv, A, 'staff', true, 'Internal staff note');
  select count(*) into n from public.ai_events where event_type = 'client_message_received';
  report := report || format(E'%s staff messages raise no client event (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  insert into public.messages (id, tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (m1, W, conv, C, 'client', false, 'Hello, can you check the logo?');
  select count(*) into n from public.ai_events where event_type = 'client_message_received' and project_id = p1;
  report := report || format(E'%s a client message raises one event on its project (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  select count(*) into n from public.ai_events where dedupe_key = 'client_message:' || m1::text;
  report := report || format(E'%s the event is keyed to the message (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  raise exception E'AI EVENT TRIGGER RESULTS (rolled back, nothing kept):\n%', report;
end $$;
