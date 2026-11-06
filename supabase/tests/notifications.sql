-- Notifications (Phase 3d): one per recipient, no duplicates, opt-outs, internal notes never notify,
-- and each person sees only their own. Rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  E uuid := '55555555-5555-4555-8555-555555555555';
  D uuid := '44444444-4444-4444-8444-444444444444';
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  p1 uuid := '00000000-0000-4000-8000-0000000000e1';
  c1 uuid := '00000000-0000-4000-8000-0000000000e2';
  m_pub uuid := '00000000-0000-4000-8000-0000000000e3';
  m_int uuid := '00000000-0000-4000-8000-0000000000e4';
  m_pub2 uuid := '00000000-0000-4000-8000-0000000000e5';
  ar uuid := '00000000-0000-4000-8000-0000000000e6';
  report text := '';
  n int;
  before_count int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (E, 'authenticated', 'authenticated', 'client-e@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values
    (org1, C, 'client_member'), (org1, E, 'client_member'), (org2, D, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name) values (p1, W, org1, 'Client one site');
  insert into public.conversations (id, tenant_id, project_id, subject) values (c1, W, p1, 'Homepage');

  -- A staff message notifies both org1 clients, once each
  insert into public.messages (id, tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (m_pub, W, c1, A, 'staff', false, 'Your homepage is ready to review.');
  select count(*) into n from public.notifications where dedupe_key like 'message:' || m_pub::text || '%';
  report := report || format(E'%s a staff message notifies each client once (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);

  -- Replaying the same event creates nothing new
  perform public.notify_project_clients(p1, 'message', 'New message from WNJO', 'x', '/account', 'message:' || m_pub::text);
  select count(*) into n from public.notifications where dedupe_key like 'message:' || m_pub::text || '%';
  report := report || format(E'%s a replayed event creates no duplicates (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);

  -- An internal note notifies nobody
  before_count := (select count(*) from public.notifications);
  insert into public.messages (id, tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (m_int, W, c1, A, 'staff', true, 'INTERNAL note');
  select count(*) into n from public.notifications;
  report := report || format(E'%s internal notes never notify clients (new rows %s, want 0)\n', case when n = before_count then 'PASS' else 'FAIL' end, n - before_count);

  -- Opting out of messages removes that client from future message notifications
  insert into public.notification_preferences (user_id, tenant_id, kind, in_app, email) values (E, W, 'message', false, false);
  insert into public.messages (id, tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (m_pub2, W, c1, A, 'staff', false, 'Second update.');
  select count(*) into n from public.notifications where dedupe_key like 'message:' || m_pub2::text || '%';
  report := report || format(E'%s an opted-out client is not notified (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  -- An approval request notifies the organisation (E opted out of messages only, so still notified)
  insert into public.approval_requests (id, tenant_id, project_id, title, kind) values (ar, W, p1, 'Homepage design', 'design');
  select count(*) into n from public.notifications where kind = 'approval';
  report := report || format(E'%s an approval request notifies both clients (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);

  -- Nobody can truncate tables from the browser (TRUNCATE bypasses row-level security)
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    truncate public.notifications;
    report := report || E'FAIL client truncated the notifications table\n';
  exception when insufficient_privilege then
    report := report || E'PASS nobody can truncate tables from the browser\n';
  end;
  reset role;

  -- Each person sees only their own notifications
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.notifications;
  report := report || format(E'%s client sees only their own notifications (got %s, want 3)\n', case when n = 3 then 'PASS' else 'FAIL' end, n);
  update public.notifications set read_at = now() where recipient_user_id = C;
  get diagnostics n = row_count;
  report := report || format(E'%s client can mark their own notifications read (rows %s, want 3)\n', case when n = 3 then 'PASS' else 'FAIL' end, n);
  begin
    update public.notifications set title = 'changed' where recipient_user_id = C;
    get diagnostics n = row_count;
    report := report || format(E'%s client cannot change notification content (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS client cannot change notification content\n';
  end;
  begin
    insert into public.notifications (tenant_id, recipient_user_id, kind, title, dedupe_key)
      values (W, C, 'message', 'Fake', 'fake');
    report := report || E'FAIL client created a notification\n';
  exception when insufficient_privilege then
    report := report || E'PASS clients cannot create notifications\n';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.notifications;
  report := report || format(E'%s another client sees none of org1''s notifications (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  raise exception E'NOTIFICATION TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
