-- Deposits: clients read deposits on their own quotes, staff read their agency's, nobody writes from the
-- browser (Phase 4f). Rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  D uuid := '44444444-4444-4444-8444-444444444444';
  B uuid := '22222222-2222-4222-8222-222222222222';
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  q1 uuid := '00000000-0000-4000-8000-0000000000e1';
  v1 uuid := '00000000-0000-4000-8000-0000000000e2';
  acc1 uuid := '00000000-0000-4000-8000-0000000000e3';
  dep1 uuid := '00000000-0000-4000-8000-0000000000e4';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-b@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-dep', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');
  insert into public.quotes (id, tenant_id, reference, organization_id, status, latest_version) values (q1, W, 'Q-0000DE01', org1, 'accepted', 1);
  insert into public.quote_versions (id, tenant_id, quote_id, version, answers, catalogue_snapshot, package_code, build_pence, range_low_pence, range_high_pence, requires_scope)
    values (v1, W, q1, 1, '{}', '{}', 'essential', 180000, 180000, 220000, false);
  insert into public.quote_acceptances (id, tenant_id, quote_id, quote_version_id, accepted_by, accepted_name, accepted_email, terms_version)
    values (acc1, W, q1, v1, C, 'Client', 'client-c@test.invalid', 'terms-1');
  insert into public.deposits (id, tenant_id, quote_acceptance_id, amount_pence) values (dep1, W, acc1, 90000);

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.deposits;
  report := report || format(E'%s staff read their agency''s deposits (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.deposits;
  report := report || format(E'%s other agency cannot read WNJO deposits (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.deposits;
  report := report || format(E'%s the client reads the deposit on their quote (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    update public.deposits set status = 'paid', paid_at = now() where id = dep1;
    get diagnostics n = row_count;
    report := report || format(E'%s the client cannot mark a deposit paid (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS the client cannot mark a deposit paid\n';
  end;
  begin
    insert into public.deposits (tenant_id, quote_acceptance_id, amount_pence) values (W, acc1, 1);
    report := report || E'FAIL the client created a deposit\n';
  exception when insufficient_privilege or unique_violation then
    report := report || E'PASS the client cannot create a deposit\n';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.deposits;
  report := report || format(E'%s another client cannot read the deposit (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  raise exception E'DEPOSIT TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
