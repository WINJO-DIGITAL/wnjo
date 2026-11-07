-- AI event queue: staff read their agency's events, nobody else does, nobody writes from the browser, and a
-- repeated event is refused by the dedupe key. Rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  B uuid := '22222222-2222-4222-8222-222222222222';
  W uuid := '00000000-0000-4000-8000-000000000001';
  T uuid := '00000000-0000-4000-8000-0000000000bb';
  ev1 uuid := '00000000-0000-4000-8000-0000000000f1';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-ev@test.invalid'),
    (B, 'authenticated', 'authenticated', 'owner-ev@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-ev@test.invalid');
  insert into public.tenants (id, slug, name) values (T, 'test-other-ev', 'Other agency');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff'), (T, B, 'owner');
  insert into public.ai_events (id, tenant_id, event_type, dedupe_key) values (ev1, W, 'deposit_paid', 'deposit_paid:test-1');

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_events;
  report := report || format(E'%s staff read their agency''s events (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.ai_events (tenant_id, event_type, dedupe_key) values (W, 'qa_failed', 'x');
    report := report || E'FAIL staff inserted an event from the browser\n';
  exception when insufficient_privilege then
    report := report || E'PASS staff cannot insert events from the browser\n';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_events;
  report := report || format(E'%s another agency cannot read the events (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.ai_events;
  report := report || format(E'%s a client cannot read the events (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  -- Server-side checks run as the owner of the database (the server's role).
  begin
    insert into public.ai_events (tenant_id, event_type, dedupe_key) values (W, 'deposit_paid', 'deposit_paid:test-1');
    report := report || E'FAIL a repeated event was accepted\n';
  exception when unique_violation then
    report := report || E'PASS a repeated event is refused by the dedupe key\n';
  end;
  begin
    insert into public.ai_events (tenant_id, event_type, dedupe_key) values (W, 'made_up_event', 'k');
    report := report || E'FAIL an unknown event type was accepted\n';
  exception when check_violation then
    report := report || E'PASS an unknown event type is refused\n';
  end;
  begin
    insert into public.ai_events (tenant_id, event_type, dedupe_key, status) values (W, 'qa_passed', 'k2', 'processed');
    report := report || E'FAIL a processed event without a time was accepted\n';
  exception when check_violation then
    report := report || E'PASS a processed event must record when it was processed\n';
  end;

  raise exception E'AI EVENTS TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
