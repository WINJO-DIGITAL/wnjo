-- Progress notifications: a customer's own order queues one notification per stage change and per update, a
-- repeat is ignored, and an unclaimed order (no customer yet) queues nothing. Rolls back every test row.
-- Expected: every line starts with PASS.
do $$
declare
  C uuid := '33333333-3333-4333-8333-333333333333';
  W uuid := '00000000-0000-4000-8000-000000000001';
  o1 uuid := '00000000-0000-4000-8000-0000000000d1';
  o2 uuid := '00000000-0000-4000-8000-0000000000d2';
  u1 uuid := '00000000-0000-4000-8000-0000000000d3';
  report text := '';
  n int;
begin
  insert into auth.users (id, aud, role, email) values (C, 'authenticated', 'authenticated', 'client-pn@test.invalid') on conflict (id) do nothing;
  insert into public.orders (id, tenant_id, customer_id, business_name, project_type, stage) values
    (o1, W, C, 'Test Bakery', 'Website', 'brief_received'),
    (o2, W, null, 'Unclaimed Co', 'Website', 'brief_received');

  update public.orders set stage = 'designing' where id = o1;
  select count(*) into n from public.notifications where recipient_user_id = C and kind = 'progress';
  report := report || format(E'%s a stage change queues one progress notification (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  update public.orders set stage = 'designing' where id = o1;
  select count(*) into n from public.notifications where recipient_user_id = C and kind = 'progress';
  report := report || format(E'%s setting the same stage again queues nothing (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  update public.orders set stage = 'building' where id = o1;
  select count(*) into n from public.notifications where recipient_user_id = C and kind = 'progress';
  report := report || format(E'%s the next stage queues its own notification (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);

  insert into public.order_updates (id, tenant_id, order_id, message) values (u1, W, o1, 'Homepage layout is ready to look at.');
  select count(*) into n from public.notifications where recipient_user_id = C and kind = 'progress';
  report := report || format(E'%s a progress update queues a notification (got %s, want 3)\n', case when n = 3 then 'PASS' else 'FAIL' end, n);

  select count(*) into n from public.notifications where dedupe_key = 'update:' || u1::text and title = 'Update on Test Bakery';
  report := report || format(E'%s the update notice names the business (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);

  update public.orders set stage = 'live' where id = o2;
  select count(*) into n from public.notifications where dedupe_key like '%' || o2::text || '%';
  report := report || format(E'%s an unclaimed order queues nothing (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);

  raise exception E'PROGRESS NOTIFICATIONS TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
