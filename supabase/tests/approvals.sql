-- Approvals and revision requests (Phase 3b). Rolls back every test row at the end. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111'; -- agency staff, WNJO
  C uuid := '33333333-3333-4333-8333-333333333333'; -- client member of org1
  D uuid := '44444444-4444-4444-8444-444444444444'; -- client member of org2
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  p1 uuid := '00000000-0000-4000-8000-0000000000b1';
  ar1 uuid := '00000000-0000-4000-8000-0000000000b2';
  ar2 uuid := '00000000-0000-4000-8000-0000000000b3';
  ar_new uuid := '00000000-0000-4000-8000-0000000000b4';
  report text := '';
  n int;
  st text;
  rid uuid;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name) values (p1, W, org1, 'Client one site');

  -- Staff create approval requests
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  insert into public.approval_requests (id, tenant_id, project_id, title, kind) values
    (ar1, W, p1, 'Homepage design', 'design'),
    (ar2, W, p1, 'Milestone 1 complete', 'milestone');
  report := report || E'PASS staff can request an approval\n';
  reset role;

  -- Client cannot create approvals
  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  begin
    insert into public.approval_requests (tenant_id, project_id, title, kind) values (W, p1, 'Self approval', 'design');
    report := report || E'FAIL client created an approval request\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot create approval requests\n';
  end;
  -- Client can see the approval; cannot change its status directly
  select count(*) into n from public.approval_requests;
  report := report || format(E'%s client sees their project''s approvals (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);
  begin
    update public.approval_requests set status = 'approved', decided_at = now() where id = ar1;
    get diagnostics n = row_count;
    report := report || format(E'%s client cannot approve by editing the row directly (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS client cannot approve by editing the row directly\n';
  end;
  -- Changes need a reason
  begin
    perform public.decide_approval(ar1, 'request_changes', 'ok');
    report := report || E'FAIL changes were requested without a reason\n';
  exception when sqlstate '22023' then
    report := report || E'PASS changes need a reason of at least three characters\n';
  end;
  -- Client can request a revision on their own project
  insert into public.revision_requests (tenant_id, project_id, approval_request_id, body) values (W, p1, ar1, 'Please make the logo larger.');
  report := report || E'PASS client can request a revision on their own project\n';
  begin
    update public.revision_requests set status = 'done' where project_id = p1;
    get diagnostics n = row_count;
    report := report || format(E'%s client cannot mark their revision done (rows %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  exception when insufficient_privilege then
    report := report || E'PASS client cannot mark their revision done\n';
  end;
  -- Client decides: request changes with a reason
  rid := public.decide_approval(ar1, 'request_changes', 'Please make the logo larger on mobile.');
  select status::text into st from public.approval_requests where id = ar1;
  report := report || format(E'%s requesting changes records the decision (status %s)\n', case when st = 'changes_requested' then 'PASS' else 'FAIL' end, st);
  begin
    perform public.decide_approval(ar1, 'approve', '');
    report := report || E'FAIL an approval was answered twice\n';
  exception when sqlstate '22023' then
    report := report || E'PASS an approval can only be answered once\n';
  end;
  -- Client approves the second request
  rid := public.decide_approval(ar2, 'approve', '');
  select status::text into st from public.approval_requests where id = ar2;
  report := report || format(E'%s approving records the decision (status %s)\n', case when st = 'approved' then 'PASS' else 'FAIL' end, st);
  reset role;

  -- Other client (D) cannot see or decide org1's approvals
  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.approval_requests;
  report := report || format(E'%s other client sees none of org1''s approvals (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  begin
    perform public.decide_approval(ar2, 'approve', '');
    report := report || E'FAIL other client answered org1''s approval\n';
  exception when sqlstate 'P0002' then
    report := report || E'PASS another client cannot answer an approval\n';
  end;
  begin
    insert into public.revision_requests (tenant_id, project_id, body) values (W, p1, 'Sneaky revision on another client''s project');
    report := report || E'FAIL other client requested a revision on org1 project\n';
  exception when insufficient_privilege then
    report := report || E'PASS another client cannot request revisions on that project\n';
  end;
  reset role;

  -- Staff see responses; the recorded email is the signed-in person's
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.approval_responses;
  report := report || format(E'%s staff see both recorded responses (got %s, want 2)\n', case when n = 2 then 'PASS' else 'FAIL' end, n);
  select responder_email into st from public.approval_responses where approval_request_id = ar2;
  report := report || format(E'%s the response records the signed-in email (got %s)\n', case when st = 'client-c@test.invalid' then 'PASS' else 'FAIL' end, st);
  reset role;

  raise exception E'APPROVAL TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
