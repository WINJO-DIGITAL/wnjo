-- Catalogue isolation, quote visibility, immutable snapshots and single acceptance (Step 2).
-- Runs in one transaction and ends with a deliberate exception that rolls back every test row.
-- Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  B uuid := '22222222-2222-4222-8222-222222222222';
  C uuid := '33333333-3333-4333-8333-333333333333';
  D uuid := '44444444-4444-4444-8444-444444444444';
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  q1 uuid := '00000000-0000-4000-8000-0000000000e1';
  v1 uuid := '00000000-0000-4000-8000-0000000000e2';
  report text := '';
  n int;
  snap_before text;
  price_after text;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-b@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-2', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');
  insert into public.pricing_packages (tenant_id, code, name, base_price_pence, included_design) values (T, 'essential', 'Other essential', 1000, 'refined');
  insert into public.quotes (id, tenant_id, reference, organization_id, status, latest_version) values (q1, W, 'Q-ABCDEF01', org1, 'sent', 1);
  insert into public.quote_versions (id, tenant_id, quote_id, version, answers, catalogue_snapshot, package_code, build_pence, range_low_pence, range_high_pence, requires_scope)
    values (v1, W, q1, 1, '{"projectType":"business"}', '{"packages":{"essential":180000}}', 'essential', 180000, 180000, 220000, false);
  insert into public.quote_version_items (tenant_id, quote_version_id, position, label, amount_pence) values (W, v1, 0, 'Essential package', 180000);

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.pricing_packages where tenant_id = W;
  report := report || format(E'%s staff reads own agency catalogue (got %s, want 3)\n', case when n = 3 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.pricing_packages where tenant_id = T;
  report := report || format(E'%s staff cannot read another agency''s prices (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  update public.pricing_packages set base_price_pence = 1 where tenant_id = T;
  get diagnostics n = row_count;
  report := report || format(E'%s staff cannot change another agency''s prices (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.quote_versions;
  report := report || format(E'%s client sees their own quote version (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.quote_version_items;
  report := report || format(E'%s client sees their own quote items (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.quote_acceptances (tenant_id, quote_id, quote_version_id, accepted_name, accepted_email, terms_version)
      values (W, q1, v1, 'Client', 'c@test.invalid', 'v1');
    report := report || E'FAIL client inserted an acceptance directly\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot write acceptance directly\n';
  end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.quote_versions;
  report := report || format(E'%s other client cannot see this quote (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  begin
    update public.quote_versions set build_pence = 1 where id = v1;
    report := report || E'FAIL quote version was changed\n';
  exception when insufficient_privilege then
    report := report || E'PASS saved quote version cannot be changed\n';
  end;
  begin
    delete from public.quote_versions where id = v1;
    report := report || E'FAIL quote version was deleted\n';
  exception when insufficient_privilege then
    report := report || E'PASS saved quote version cannot be deleted\n';
  end;

  select build_pence::text into snap_before from public.quote_versions where id = v1;
  update public.pricing_packages set base_price_pence = 999999 where tenant_id = W and code = 'essential';
  select build_pence::text into price_after from public.quote_versions where id = v1;
  report := report || format(E'%s quote snapshot is unchanged after a price change (before %s, after %s)\n',
    case when snap_before = price_after then 'PASS' else 'FAIL' end, snap_before, price_after);

  insert into public.quote_acceptances (tenant_id, quote_id, quote_version_id, accepted_by, accepted_name, accepted_email, terms_version)
    values (W, q1, v1, C, 'Client', 'c@test.invalid', 'terms-1');
  begin
    insert into public.quote_acceptances (tenant_id, quote_id, quote_version_id, accepted_name, accepted_email, terms_version)
      values (W, q1, v1, 'Again', 'c@test.invalid', 'terms-1');
    report := report || E'FAIL version accepted twice\n';
  exception when unique_violation then
    report := report || E'PASS a version can only be accepted once\n';
  end;

  raise exception E'QUOTE TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
