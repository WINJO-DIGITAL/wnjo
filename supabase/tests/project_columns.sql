-- Clients can read a project's customer-safe columns only (Phase 3a fix). Rolls back every test row.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  p1 uuid := '00000000-0000-4000-8000-0000000000f1';
  report text := '';
  nm text;
begin
  insert into auth.users (id, aud, role, email) values (A, 'authenticated', 'authenticated', 'a@test.invalid'), (C, 'authenticated', 'authenticated', 'c@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'x');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name, status, priority) values (p1, W, org1, 'Visible name', 'in_progress', 'urgent');

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select name into nm from public.projects where id = p1;
  report := report || format(E'%s client can read the customer-safe project name (got %s)\n', case when nm = 'Visible name' then 'PASS' else 'FAIL' end, nm);
  begin
    perform status from public.projects where id = p1;
    report := report || E'FAIL client read the internal status\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot read the internal status\n';
  end;
  begin
    perform priority from public.projects where id = p1;
    report := report || E'FAIL client read the internal priority\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot read the internal priority\n';
  end;
  reset role;

  raise exception E'PROJECT COLUMN TEST (rolled back, nothing kept):\n%', report;
end $$;
