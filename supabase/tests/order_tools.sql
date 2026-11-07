-- Staff order tools: staff move an order's stage and post updates for their own agency only; updates are
-- append-only; customers see the updates on their own order (Phase 3h). Rolls back every test row.
-- Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff, WNJO
  B uuid := '22222222-2222-4222-8222-222222222222'; -- owner of another agency
  C uuid := '33333333-3333-4333-8333-333333333333'; -- customer of WNJO's order
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  o_w uuid := '00000000-0000-4000-8000-0000000000f1';
  o_t uuid := '00000000-0000-4000-8000-0000000000f2';
  u_w uuid := '00000000-0000-4000-8000-0000000000f3';
  report text := '';
  n int;
  before_ts timestamptz;
  after_ts timestamptz;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-b@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-ord', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.orders (id, tenant_id, customer_id, business_name, project_type, stage, stage_updated_at) values
    (o_w, W, C, 'Client one site', 'business', 'brief_received', '2020-01-01T00:00:00Z'),
    (o_t, T, null, 'Other agency client', 'business', 'brief_received', '2020-01-01T00:00:00Z');

  -- Staff (A) moves their own order to the next stage; the stage timestamp is recorded
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated', 'email', 'staff-a@test.invalid')::text, true);
  set role authenticated;
  update public.orders set stage = 'designing' where id = o_w;
  get diagnostics n = row_count;
  report := report || format(E'%s staff can move their own order to a new stage (rows %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  reset role;
  select stage_updated_at into after_ts from public.orders where id = o_w;
  report := report || format(E'%s moving the stage records when it changed (updated %s)\n',
    case when after_ts > '2020-01-01T00:00:00Z' then 'PASS' else 'FAIL' end, after_ts);

  -- Staff cannot move another agency's order
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated', 'email', 'staff-a@test.invalid')::text, true);
  set role authenticated;
  update public.orders set stage = 'live' where id = o_t;
  get diagnostics n = row_count;
  report := report || format(E'%s staff cannot move another agency''s order (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  -- Staff can change the stage only, not the customer, name or agency
  begin
    update public.orders set business_name = 'Renamed' where id = o_w;
    report := report || E'FAIL staff renamed an order\n';
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot change anything but the stage\n';
  end;
  begin
    update public.orders set customer_id = B where id = o_w;
    report := report || E'FAIL staff reassigned an order to another customer\n';
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot reassign an order to another customer\n';
  end;
  -- Unknown stages are refused
  begin
    update public.orders set stage = 'finished' where id = o_w;
    report := report || E'FAIL an unknown stage was accepted\n';
  exception when check_violation then
    report := report || E'PASS an unknown stage is refused\n';
  end;

  -- Staff post a dated update on their own order
  insert into public.order_updates (id, order_id, message) values (u_w, o_w, 'Layouts are drawn. Three directions to choose from.');
  report := report || E'PASS staff can post an update on their own order\n';
  -- ...but not on another agency's order
  begin
    insert into public.order_updates (order_id, message) values (o_t, 'Not ours');
    report := report || E'FAIL staff posted an update on another agency''s order\n';
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot post on another agency''s order\n';
  end;
  -- Updates are append-only: they cannot be edited or deleted
  begin
    update public.order_updates set message = 'Changed' where id = u_w;
    report := report || E'FAIL an update was edited\n';
  exception when insufficient_privilege then
    report := report || E'PASS posted updates cannot be edited\n';
  end;
  begin
    delete from public.order_updates where id = u_w;
    report := report || E'FAIL an update was deleted\n';
  exception when insufficient_privilege then
    report := report || E'PASS posted updates cannot be deleted\n';
  end;
  -- Empty updates are refused
  begin
    insert into public.order_updates (order_id, message) values (o_w, '');
    report := report || E'FAIL an empty update was accepted\n';
  exception when check_violation then
    report := report || E'PASS an empty update is refused\n';
  end;
  reset role;

  -- The customer (C) can read the update on their order, but cannot move the stage or post
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated', 'email', 'client-c@test.invalid')::text, true);
  set role authenticated;
  select count(*) into n from public.order_updates;
  report := report || format(E'%s the customer reads the update on their order (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  update public.orders set stage = 'live' where id = o_w;
  get diagnostics n = row_count;
  report := report || format(E'%s the customer cannot move the stage (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.order_updates (order_id, message) values (o_w, 'Sneaky');
    report := report || E'FAIL the customer posted an update\n';
  exception when insufficient_privilege then
    report := report || E'PASS the customer cannot post updates\n';
  end;
  reset role;

  raise exception E'ORDER TOOLS TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
