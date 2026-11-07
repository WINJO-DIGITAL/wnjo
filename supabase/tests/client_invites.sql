-- Client invites: staff link a customer to their order; only the matching, verified email can claim it,
-- and an order that already belongs to someone else is never taken over (Phase 3f). Rolls back every
-- test row at the end. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff, WNJO
  B uuid := '22222222-2222-4222-8222-222222222222'; -- owner of another agency
  C uuid := '33333333-3333-4333-8333-333333333333'; -- customer, client-c@test.invalid
  E uuid := '55555555-5555-4555-8555-555555555555'; -- someone else, other-e@test.invalid
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  o_w uuid := '00000000-0000-4000-8000-0000000000e1';
  o_t uuid := '00000000-0000-4000-8000-0000000000e2';
  p1 uuid := '00000000-0000-4000-8000-0000000000e3';
  inv_c uuid := '00000000-0000-4000-8000-0000000000e4';
  inv_e uuid := '00000000-0000-4000-8000-0000000000e5';
  report text := '';
  n int;
  got int;
  owner uuid;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-b@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (E, 'authenticated', 'authenticated', 'other-e@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-inv', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one');
  insert into public.orders (id, tenant_id, customer_id, business_name, project_type) values
    (o_w, W, null, 'Client one site', 'business'),
    (o_t, T, null, 'Other agency client', 'business');
  insert into public.projects (id, tenant_id, organization_id, order_id, name) values (p1, W, org1, o_w, 'Client one site');

  -- Staff (A) can invite a customer to their own agency's order
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  insert into public.client_invites (id, tenant_id, email, order_id)
    values (inv_c, W, 'client-c@test.invalid', o_w);
  report := report || E'PASS staff can invite a customer to their own order\n';
  -- ...but not to another agency's order
  begin
    insert into public.client_invites (tenant_id, email, order_id) values (W, 'client-c@test.invalid', o_t);
    report := report || E'FAIL staff linked an order from another agency\n';
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot link another agency''s order\n';
  end;
  select count(*) into n from public.client_invites;
  report := report || format(E'%s staff can read invites for their agency (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  reset role;

  -- Another agency (B) cannot see WNJO's invites
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.client_invites;
  report := report || format(E'%s other agency cannot read WNJO invites (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  -- A customer (C) cannot read or create invites
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.client_invites;
  report := report || format(E'%s customer cannot read invites (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.client_invites (tenant_id, email, order_id) values (W, 'client-c@test.invalid', o_w);
    report := report || E'FAIL customer created an invite\n';
  exception when insufficient_privilege then
    report := report || E'PASS customer cannot create invites\n';
  end;
  -- Signed-out callers cannot claim
  reset role;
  set role anon;
  begin
    perform public.claim_client_invites();
    report := report || E'FAIL signed-out visitor claimed an invite\n';
  exception when insufficient_privilege then
    report := report || E'PASS signed-out visitor cannot claim an invite\n';
  end;
  reset role;

  -- The matching customer claims their invite: the order is theirs and they can see the project's organisation
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated', 'email', 'client-c@test.invalid')::text, true);
  set role authenticated;
  got := public.claim_client_invites();
  report := report || format(E'%s the customer claims one invite (got %s, want 1)\n', case when got = 1 then 'PASS' else 'FAIL' end, got);
  select customer_id into owner from public.orders where id = o_w;
  report := report || format(E'%s the order now belongs to the customer (customer %s)\n', case when owner = C then 'PASS' else 'FAIL' end, owner);
  select count(*) into n from public.organization_members where organization_id = org1 and user_id = C;
  report := report || format(E'%s the customer is added to the project''s organisation (rows %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.projects;
  report := report || format(E'%s the customer can now see the project (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.orders;
  report := report || format(E'%s the customer can see their order (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  -- Claiming again does nothing
  got := public.claim_client_invites();
  report := report || format(E'%s a claimed invite cannot be claimed twice (got %s, want 0)\n', case when got = 0 then 'PASS' else 'FAIL' end, got);
  reset role;

  -- Someone else (E) cannot take over the order, even with an invite for their own email
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  insert into public.client_invites (id, tenant_id, email, order_id)
    values (inv_e, W, 'other-e@test.invalid', o_w);
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', E, 'role', 'authenticated', 'email', 'other-e@test.invalid')::text, true);
  set role authenticated;
  got := public.claim_client_invites();
  report := report || format(E'%s an order already owned by a customer is not taken over (claimed %s, want 0)\n', case when got = 0 then 'PASS' else 'FAIL' end, got);
  reset role;
  select customer_id into owner from public.orders where id = o_w;
  report := report || format(E'%s the order still belongs to the first customer (customer %s)\n', case when owner = C then 'PASS' else 'FAIL' end, owner);
  select count(*) into n from public.client_invites where id = inv_e and claimed_at is null;
  report := report || format(E'%s the untaken invite stays open (rows %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  raise exception E'CLIENT INVITE TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
