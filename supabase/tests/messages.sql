-- Project messages: clients never see internal notes, cannot write as someone else, and cannot reach
-- other clients' projects (Step 3a). Rolls back every test row at the end. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff, WNJO
  B uuid := '22222222-2222-4222-8222-222222222222'; -- owner of another agency
  C uuid := '33333333-3333-4333-8333-333333333333'; -- client member of org1
  D uuid := '44444444-4444-4444-8444-444444444444'; -- client member of org2
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  p1 uuid := '00000000-0000-4000-8000-0000000000a1';
  c1 uuid := '00000000-0000-4000-8000-0000000000a2';
  m_client uuid := '00000000-0000-4000-8000-0000000000a3';
  m_internal uuid := '00000000-0000-4000-8000-0000000000a4';
  m_staff uuid := '00000000-0000-4000-8000-0000000000a5';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-b@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-msg', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name) values (p1, W, org1, 'Client one site');
  insert into public.conversations (id, tenant_id, project_id, subject) values (c1, W, p1, 'Homepage');
  insert into public.messages (id, tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body) values
    (m_client, W, c1, C, 'client', false, 'Can we use our own photos?'),
    (m_internal, W, c1, A, 'staff', true, 'INTERNAL: client is price sensitive, do not discount'),
    (m_staff, W, c1, A, 'staff', false, 'Yes, send them over.');

  -- Client (C) of org1
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.messages;
  report := report || format(E'%s client sees only customer-visible messages (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.messages where is_internal;
  report := report || format(E'%s client cannot see internal notes (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.projects;
  report := report || format(E'%s client sees their own project (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
      values (W, c1, C, 'client', true, 'sneaky internal');
    report := report || E'FAIL client posted an internal message\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot post internal messages\n';
  end;
  begin
    insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
      values (W, c1, D, 'client', false, 'posing as another client');
    report := report || E'FAIL client posted as another person\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot post as another person\n';
  end;
  begin
    insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
      values (W, c1, C, 'staff', false, 'pretending to be staff');
    report := report || E'FAIL client posted as staff\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot post as staff\n';
  end;
  insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
    values (W, c1, C, 'client', false, 'Here is the logo.');
  report := report || E'PASS client can post a customer-visible message\n';
  begin
    update public.messages set body = 'edited' where id = m_client;
    get diagnostics n = row_count;
    report := report || format(E'%s client cannot edit messages (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS client cannot edit messages\n';
  end;
  reset role;

  -- Other client (D) of org2
  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.messages;
  report := report || format(E'%s other client sees none of org1''s messages (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.projects;
  report := report || format(E'%s other client sees none of org1''s projects (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
      values (W, c1, D, 'client', false, 'hello?');
    report := report || E'FAIL other client posted into org1 project\n';
  exception when insufficient_privilege then
    report := report || E'PASS other client cannot post into another client''s project\n';
  end;
  reset role;

  -- Agency staff (A) sees everything, including internal notes
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.messages;
  report := report || format(E'%s staff sees all messages including internal (got %s, want 4)\n', case when n = 4 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.messages (tenant_id, conversation_id, sender_user_id, sender_kind, is_internal, body)
      values (W, c1, A, 'system', false, 'forged system message');
    report := report || E'FAIL staff created a system message from the browser\n';
  exception when insufficient_privilege then
    report := report || E'PASS system messages cannot be created from the browser\n';
  end;
  reset role;

  -- Other agency (B) sees nothing of WNJO
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.messages where tenant_id = W;
  report := report || format(E'%s other agency cannot read WNJO messages (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  raise exception E'MESSAGE TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
