-- AI orchestration tables: staff read, nobody writes from the browser, clients see nothing (Phase 4a).
-- Rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values (A, 'authenticated', 'authenticated', 'a@test.invalid'), (C, 'authenticated', 'authenticated', 'c@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'x');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member');
  insert into public.ai_agents (tenant_id, agent_key, name) values (W, 'developer', 'Developer');
  insert into public.ai_permissions (tenant_id, agent_key, tool, allowed) values (W, 'developer', 'read_project', true);
  insert into public.ai_tasks (tenant_id, agent_key, title) values (W, 'developer', 'Fix homepage');

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_tasks;
  report := report || format(E'%s staff can read agent tasks (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.ai_permissions;
  report := report || format(E'%s staff can read agent permissions (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.ai_permissions (tenant_id, agent_key, tool, allowed) values (W, 'developer', 'change_quote_price', true);
    report := report || E'FAIL staff granted an agent a permission from the browser\n';
  exception when insufficient_privilege then
    report := report || E'PASS nobody can grant agent permissions from the browser\n';
  end;
  begin
    update public.ai_tasks set status = 'succeeded';
    report := report || E'FAIL staff changed a task status from the browser\n';
  exception when insufficient_privilege then
    report := report || E'PASS task status can only be changed by the server\n';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_tasks;
  report := report || format(E'%s client sees no agent tasks (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.ai_budget_settings;
  report := report || format(E'%s client sees no budgets (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  raise exception E'AI ACCESS TEST (rolled back, nothing kept):\n%', report;
end $$;
