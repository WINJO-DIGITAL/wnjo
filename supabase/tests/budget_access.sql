-- AI budgets: only owners and admins read them, nothing is writable from the browser, the scope rules hold,
-- and the monthly spend the loader sums is what staff can see (Phase 4g). Rolls back every test row.
-- Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff, WNJO
  M uuid := '66666666-6666-4666-8666-666666666666'; -- agency admin, WNJO
  C uuid := '33333333-3333-4333-8333-333333333333'; -- client
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bc';
  report text := '';
  n int;
  total int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (M, 'authenticated', 'authenticated', 'admin-m@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-budget', 'Budget test agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (W, M, 'admin');
  insert into public.organizations (id, tenant_id, name) values ('0000b000-0000-4000-8000-00000000b001', W, 'Client for budget test');
  insert into public.organization_members (organization_id, user_id, role) values ('0000b000-0000-4000-8000-00000000b001', C, 'client_member');
  insert into public.ai_agents (tenant_id, agent_key, name) values (W, 'developer', 'Developer') on conflict (tenant_id, agent_key) do nothing;
  insert into public.ai_tasks (tenant_id, agent_key, title, spent_pence) values
    (W, 'developer', 'Budget test task one', 300),
    (W, 'developer', 'Budget test task two', 200);

  -- Staff cannot read budgets; the admin can
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated', 'email', 'staff-a@test.invalid')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_budget_settings;
  report := report || format(E'%s staff cannot read AI budgets (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  -- Staff can read this month's agent spend, which is what the budget loader adds up
  select coalesce(sum(spent_pence), 0) into total from public.ai_tasks where agent_key = 'developer' and title like 'Budget test task%';
  report := report || format(E'%s staff can read the agent spend the budget loader sums (got %s, want 500)\n', case when total = 500 then 'PASS' else 'FAIL' end, total);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', M, 'role', 'authenticated', 'email', 'admin-m@test.invalid')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_budget_settings where tenant_id = W;
  report := report || format(E'%s the agency admin reads their budgets (got %s, want at least 1)\n', case when n >= 1 then 'PASS' else 'FAIL' end, n);
  begin
    update public.ai_budget_settings set monthly_limit_pence = 999999 where tenant_id = W;
    get diagnostics n = row_count;
    report := report || format(E'%s the admin cannot change a budget from the browser (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS the admin cannot change a budget from the browser\n';
  end;
  reset role;

  -- A client reads nothing
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated', 'email', 'client-c@test.invalid')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_budget_settings;
  report := report || format(E'%s a client cannot read AI budgets (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  -- Scope rules, on a fresh agency with no seeded budgets
  insert into public.ai_budget_settings (tenant_id, scope, scope_id, monthly_limit_pence, warn_at_pence)
    values (T, 'global', null, 10000, 8000);
  begin
    insert into public.ai_budget_settings (tenant_id, scope, scope_id, monthly_limit_pence, warn_at_pence)
      values (T, 'global', null, 5000, 4000);
    report := report || E'FAIL two global budgets were accepted for one agency\n';
  exception when unique_violation then
    report := report || E'PASS an agency has one global budget\n';
  end;
  begin
    insert into public.ai_budget_settings (tenant_id, scope, scope_id, monthly_limit_pence, warn_at_pence)
      values (T, 'global', 'developer', 5000, 4000);
    report := report || E'FAIL a global budget was given a scope id\n';
  exception when check_violation then
    report := report || E'PASS a global budget has no scope id\n';
  end;
  begin
    insert into public.ai_budget_settings (tenant_id, scope, scope_id, monthly_limit_pence, warn_at_pence)
      values (T, 'agent', 'developer', -1, 0);
    report := report || E'FAIL a negative budget was accepted\n';
  exception when check_violation then
    report := report || E'PASS a budget cannot be negative\n';
  end;

  raise exception E'BUDGET ACCESS TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
