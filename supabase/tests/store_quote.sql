-- store_quote atomicity and access (Step 2d). Rolls back every test row at the end.
do $$
declare
  W uuid := '00000000-0000-4000-8000-000000000001';
  org uuid := '00000000-0000-4000-8000-0000000000a1';
  C uuid := '33333333-3333-4333-8333-333333333333';
  qid uuid;
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values (C, 'authenticated', 'authenticated', 'client-c@test.invalid');
  insert into public.organizations (id, tenant_id, name) values (org, W, 'Store test client');
  insert into public.organization_members (organization_id, user_id, role) values (org, C, 'client_member');

  qid := public.store_quote(
    jsonb_build_object('tenant_id', W, 'reference', 'Q-5EED0001', 'organization_id', org, 'enquiry_id', '', 'expires_at', now() + interval '30 days'),
    jsonb_build_object('tenant_id', W, 'answers', '{"projectType":"business"}'::jsonb, 'catalogue_snapshot', '{"packages":{}}'::jsonb,
      'package_code', 'essential', 'build_pence', 180000, 'range_low_pence', 180000, 'range_high_pence', 220000,
      'monthly_pence', 0, 'requires_scope', false, 'scope_reasons', '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('tenant_id', W, 'position', 0, 'label', 'Essential package', 'amount_pence', 180000)));
  select count(*) into n from public.quote_version_items i join public.quote_versions v on v.id = i.quote_version_id where v.quote_id = qid;
  report := report || format(E'%s store_quote writes the quote, version and items together (items %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  begin
    perform public.store_quote(
      jsonb_build_object('tenant_id', W, 'reference', 'Q-5EED0002', 'organization_id', org, 'enquiry_id', '', 'expires_at', now() + interval '30 days'),
      jsonb_build_object('tenant_id', W, 'answers', '{}'::jsonb, 'catalogue_snapshot', '{}'::jsonb, 'package_code', 'essential',
        'build_pence', 1, 'range_low_pence', 1, 'range_high_pence', 1, 'monthly_pence', 0, 'requires_scope', false, 'scope_reasons', '[]'::jsonb),
      jsonb_build_array(jsonb_build_object('tenant_id', W, 'position', 0, 'label', 'Bad', 'amount_pence', null)));
    report := report || E'FAIL a bad item was accepted\n';
  exception when not_null_violation then
    report := report || E'PASS a failed write leaves nothing behind\n';
  end;
  select count(*) into n from public.quotes where reference = 'Q-5EED0002';
  report := report || format(E'%s no partial quote remains (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    perform public.store_quote('{}'::jsonb, '{}'::jsonb, '[]'::jsonb);
    report := report || E'FAIL a signed-in client called store_quote\n';
  exception when insufficient_privilege then
    report := report || E'PASS signed-in clients cannot call store_quote\n';
  end;
  reset role;

  raise exception E'STORE QUOTE TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
