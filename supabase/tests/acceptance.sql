-- Quote acceptance and decline rules (Step 2d). Runs in one transaction and ends with a deliberate
-- exception that rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  C uuid := '33333333-3333-4333-8333-333333333333'; -- client member of org1
  D uuid := '44444444-4444-4444-8444-444444444444'; -- client member of org2
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff (no client role)
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000f1';
  org2 uuid := '00000000-0000-4000-8000-0000000000f2';
  q_open uuid := '00000000-0000-4000-8000-0000000000f3';
  v_open uuid := '00000000-0000-4000-8000-0000000000f4';
  q_expired uuid := '00000000-0000-4000-8000-0000000000f5';
  v_expired uuid := '00000000-0000-4000-8000-0000000000f6';
  q_revised uuid := '00000000-0000-4000-8000-0000000000f7';
  v_revised_old uuid := '00000000-0000-4000-8000-0000000000f8';
  v_revised_new uuid := '00000000-0000-4000-8000-0000000000f9';
  q_decline uuid := '00000000-0000-4000-8000-0000000000fa';
  v_decline uuid := '00000000-0000-4000-8000-0000000000fb';
  report text := '';
  acc_id uuid;
  n int;
  got_state text;
begin
  insert into auth.users (id, aud, role, email) values
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid'),
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');

  insert into public.quotes (id, tenant_id, reference, organization_id, status, latest_version, expires_at) values
    (q_open, W, 'Q-0000F301', org1, 'sent', 1, now() + interval '30 days'),
    (q_expired, W, 'Q-0000F302', org1, 'sent', 1, now() - interval '1 day'),
    (q_revised, W, 'Q-0000F303', org1, 'sent', 2, now() + interval '30 days'),
    (q_decline, W, 'Q-0000F304', org1, 'sent', 1, now() + interval '30 days');
  insert into public.quote_versions (id, tenant_id, quote_id, version, answers, catalogue_snapshot, package_code, build_pence, range_low_pence, range_high_pence, requires_scope) values
    (v_open, W, q_open, 1, '{}', '{}', 'essential', 180000, 180000, 220000, false),
    (v_expired, W, q_expired, 1, '{}', '{}', 'essential', 180000, 180000, 220000, false),
    (v_revised_old, W, q_revised, 1, '{}', '{}', 'essential', 180000, 180000, 220000, false),
    (v_revised_new, W, q_revised, 2, '{}', '{}', 'essential', 200000, 200000, 240000, false),
    (v_decline, W, q_decline, 1, '{}', '{}', 'essential', 180000, 180000, 220000, false);

  -- Signed-out callers are refused
  set role anon;
  begin
    perform public.accept_quote(v_open, 'Anon Person', 'terms-1');
    report := report || E'FAIL signed-out visitor accepted a quote\n';
  exception when insufficient_privilege or sqlstate '42501' then
    report := report || E'PASS signed-out visitor cannot accept a quote\n';
  end;
  reset role;

  -- Staff who are not client members cannot accept
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    perform public.accept_quote(v_open, 'Staff Person', 'terms-1');
    report := report || E'FAIL agency staff accepted a client quote\n';
  exception when sqlstate 'P0002' then
    report := report || E'PASS agency staff cannot accept a client quote\n';
  end;
  reset role;

  -- Another client organisation cannot accept
  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    perform public.accept_quote(v_open, 'Other Client', 'terms-1');
    report := report || E'FAIL other client accepted a quote\n';
  exception when sqlstate 'P0002' then
    report := report || E'PASS another client organisation cannot accept\n';
  end;
  reset role;

  -- The right client: name too short is refused, then a valid acceptance works
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    perform public.accept_quote(v_open, 'X', 'terms-1');
    report := report || E'FAIL a one-character name was accepted\n';
  exception when sqlstate '22023' then
    report := report || E'PASS name must be at least two characters\n';
  end;
  acc_id := public.accept_quote(v_open, '  Client Person  ', 'terms-1', 'test-agent');
  reset role;
  select accepted_name || '|' || accepted_email || '|' || terms_version into got_state from public.quote_acceptances where id = acc_id;
  report := report || format(E'%s valid acceptance records trimmed name, verified email and terms (got %s)\n',
    case when got_state = 'Client Person|client-c@test.invalid|terms-1' then 'PASS' else 'FAIL' end, got_state);
  select status::text into got_state from public.quotes where id = q_open;
  report := report || format(E'%s quote status becomes accepted (got %s)\n', case when got_state = 'accepted' then 'PASS' else 'FAIL' end, got_state);

  -- A second acceptance of the same version is refused
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    perform public.accept_quote(v_open, 'Client Person', 'terms-1');
    report := report || E'FAIL a version was accepted twice\n';
  exception when sqlstate '22023' then
    report := report || E'PASS a quote cannot be accepted twice\n';
  end;
  reset role;

  -- Expired quotes are refused
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    perform public.accept_quote(v_expired, 'Client Person', 'terms-1');
    report := report || E'FAIL an expired quote was accepted\n';
  exception when sqlstate '22023' then
    report := report || E'PASS expired quotes cannot be accepted\n';
  end;
  -- Superseded versions are refused; the latest version can be accepted
  begin
    perform public.accept_quote(v_revised_old, 'Client Person', 'terms-1');
    report := report || E'FAIL a superseded version was accepted\n';
  exception when sqlstate '22023' then
    report := report || E'PASS a superseded version cannot be accepted\n';
  end;
  perform public.accept_quote(v_revised_new, 'Client Person', 'terms-1');
  report := report || E'PASS the latest version of a revised quote can be accepted\n';
  -- Decline records the outcome and closes the quote
  perform public.decline_quote(v_decline, 'Not this year');
  reset role;
  select status::text into got_state from public.quotes where id = q_decline;
  report := report || format(E'%s decline closes the quote (got %s)\n', case when got_state = 'declined' then 'PASS' else 'FAIL' end, got_state);

  -- Clients cannot change quotes directly, even the ones they accepted
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    update public.quotes set status = 'draft' where id = q_open;
    get diagnostics n = row_count;
    report := report || format(E'%s client cannot change a quote directly (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS client cannot change a quote directly\n';
  end;
  reset role;

  raise exception E'ACCEPTANCE TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
