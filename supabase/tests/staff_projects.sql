-- Staff project management permissions (Phase 3e). Rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  p1 uuid := '00000000-0000-4000-8000-0000000000f1';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values (A, 'authenticated', 'authenticated', 'a@test.invalid'), (C, 'authenticated', 'authenticated', 'c@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'x'), (org2, W, 'y');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name) values (p1, W, org1, 'Project');

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  update public.projects set customer_status = 'In build', target_date = '2027-01-15' where id = p1;
  get diagnostics n = row_count;
  report := report || format(E'%s staff can update client-visible progress (rows %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    update public.projects set organization_id = org2 where id = p1;
    get diagnostics n = row_count;
    report := report || format(E'%s staff cannot move a project to another client (rows %s, want 0 or denied)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot move a project to another client\n';
  end;
  begin
    insert into public.projects (tenant_id, organization_id, name) values (W, org1, 'Direct insert');
    report := report || E'FAIL staff inserted a project from the browser\n';
  exception when insufficient_privilege then
    report := report || E'PASS projects are created by the server, not the browser\n';
  end;
  update public.projects set name = 'renamed' where id = p1;
  get diagnostics n = row_count;
  report := report || format(E'%s staff can rename a project (rows %s)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  reset role;

  raise exception E'STAFF PROJECT TEST (rolled back, nothing kept):\n%', report;
end $$;
