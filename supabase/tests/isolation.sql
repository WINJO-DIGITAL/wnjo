-- Tenant and customer isolation tests (Step 1).
-- Run with the Supabase SQL editor or `psql` as the database owner. The whole script ends with a
-- deliberate exception that rolls back every test row, so nothing is left in the database.
-- Expected output: every line starts with PASS. Any FAIL line is a security regression.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff, WNJO
  B uuid := '22222222-2222-4222-8222-222222222222'; -- owner of another agency
  C uuid := '33333333-3333-4333-8333-333333333333'; -- client member of organisation 1
  D uuid := '44444444-4444-4444-8444-444444444444'; -- client member of organisation 2
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  ord_w uuid := '00000000-0000-4000-8000-0000000000d1';
  ord_t uuid := '00000000-0000-4000-8000-0000000000d2';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-b@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');
  insert into public.orders (id, tenant_id, customer_id, business_name, project_type) values
    (ord_w, W, C, 'Client one site', 'business'),
    (ord_t, T, D, 'Other agency client', 'business');
  insert into public.enquiries (reference, kind, name, email, subject, body, tenant_id) values
    ('WNJO-TEST01', 'contact', 'Visitor', 'v@test.invalid', 's', 'b', W),
    ('OTHER-TEST01', 'contact', 'Other visitor', 'o@test.invalid', 's', 'b', T);
  insert into public.audit_logs (tenant_id, action, entity) values (W, 'test.event', 'x');
  insert into public.addresses (tenant_id, organization_id, line1, city, postcode) values (W, org2, '1 Test St', 'Testville', 'TE1 1ST');

  -- 1. Agency staff (A) sees only WNJO
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.tenants;
  report := report || format(E'%s staff sees only own agency (tenants visible %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.orders where tenant_id = T;
  report := report || format(E'%s staff cannot read another agency''s orders (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.enquiries where tenant_id = T;
  report := report || format(E'%s staff cannot read another agency''s enquiries (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.enquiries where tenant_id = W;
  report := report || format(E'%s staff can read own agency''s enquiries (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.audit_logs;
  report := report || format(E'%s staff (not owner/admin) cannot read the audit log (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  update public.tenant_settings set timezone = 'Europe/Paris' where tenant_id = T;
  get diagnostics n = row_count;
  report := report || format(E'%s staff cannot change another agency''s settings (rows changed %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  -- 2. Other agency owner (B) cannot see WNJO
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.orders where tenant_id = W;
  report := report || format(E'%s other agency cannot read WNJO orders (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.enquiries where tenant_id = W;
  report := report || format(E'%s other agency cannot read WNJO enquiries (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.tenant_members where tenant_id = W;
  report := report || format(E'%s other agency cannot read WNJO staff list (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  -- 3. Client (C) sees only their own order and organisation
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.orders;
  report := report || format(E'%s client sees only own order (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.organizations where id = org2;
  report := report || format(E'%s client cannot see another client''s organisation (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.tenant_members;
  report := report || format(E'%s client cannot see agency staff (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.enquiries;
  report := report || format(E'%s client cannot read enquiries (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.audit_logs;
  report := report || format(E'%s client cannot read the audit log (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.addresses where organization_id = org2;
  report := report || format(E'%s client cannot read another client''s address (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.profiles where user_id = D;
  report := report || format(E'%s client cannot read another person''s profile (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.orders (tenant_id, customer_id, business_name, project_type) values (W, C, 'forged', 'business');
    report := report || E'FAIL client can insert orders (should be denied)\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot insert orders\n';
  end;
  reset role;

  -- 4. Signed-out visitor
  set role anon;
  begin
    select count(*) into n from public.orders;
    report := report || format(E'%s signed-out visitor cannot read orders (rows %s)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS signed-out visitor denied at grant level\n';
  end;
  reset role;

  raise exception E'ISOLATION TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
