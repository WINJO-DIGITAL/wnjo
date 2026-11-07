-- AI approvals: staff read their agency's approvals, other agencies and clients cannot, browsers cannot write,
-- one open request per task and tool, and a decision needs who made it. Rolls back every test row.
-- Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  B uuid := '22222222-2222-4222-8222-222222222222';
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  task1 uuid := '00000000-0000-4000-8000-0000000000a1';
  appr1 uuid := '00000000-0000-4000-8000-0000000000a2';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-ap@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-ap@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-ap@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-ap', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.ai_tasks (id, tenant_id, agent_key, title) values (task1, W, 'developer', 'Test task');
  insert into public.ai_approvals (id, tenant_id, task_id, tool, reason) values (appr1, W, task1, 'publish_site', 'Test');

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_approvals;
  report := report || format(E'%s staff read their agency''s approvals (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.ai_approvals (tenant_id, task_id, tool, reason) values (W, task1, 'other', 'x');
    report := report || E'FAIL staff inserted an approval from the browser\n';
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot insert approvals from the browser\n';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_approvals;
  report := report || format(E'%s another agency cannot read the approvals (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_approvals;
  report := report || format(E'%s a client cannot read the approvals (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  begin
    insert into public.ai_approvals (tenant_id, task_id, tool, reason) values (W, task1, 'publish_site', 'again');
    report := report || E'FAIL a second open request for the same tool was accepted\n';
  exception when unique_violation then
    report := report || E'PASS only one open request per task and tool\n';
  end;
  begin
    insert into public.ai_approvals (tenant_id, task_id, tool, reason, status, decided_at) values (W, task1, 'other_tool', 'x', 'approved', now());
    report := report || E'FAIL an approval was accepted without a decider\n';
  exception when check_violation then
    report := report || E'PASS an approval must record who decided it\n';
  end;
  begin
    insert into public.ai_approvals (tenant_id, task_id, tool, reason, status, decided_by, decided_at) values (W, task1, 'other_tool', 'x', 'approved', B, now());
    report := report || E'PASS a decided approval with its decider is accepted\n';
  exception when others then
    report := report || E'FAIL a decided approval with its decider was refused\n';
  end;

  raise exception E'AI APPROVALS TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
