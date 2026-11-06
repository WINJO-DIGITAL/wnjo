-- Project file metadata access (Phase 3c). Rolls back every test row. Expected: every line starts with PASS.
do $$
declare
  A uuid := '11111111-1111-4111-8111-111111111111';
  C uuid := '33333333-3333-4333-8333-333333333333';
  D uuid := '44444444-4444-4444-8444-444444444444';
  W uuid := '00000000-0000-4000-8000-000000000001';
  org1 uuid := '00000000-0000-4000-8000-0000000000c1';
  org2 uuid := '00000000-0000-4000-8000-0000000000c2';
  p1 uuid := '00000000-0000-4000-8000-0000000000d1';
  f_public uuid := '00000000-0000-4000-8000-0000000000d2';
  f_internal uuid := '00000000-0000-4000-8000-0000000000d3';
  report text := '';
  n int;
  bucket_public boolean;
begin
  insert into auth.users (id, aud, role, email) values
    (A, 'authenticated', 'authenticated', 'staff-a@test.invalid'),
    (C, 'authenticated', 'authenticated', 'client-c@test.invalid'),
    (D, 'authenticated', 'authenticated', 'client-d@test.invalid');
  insert into public.tenant_members (tenant_id, user_id, role) values (W, A, 'staff');
  insert into public.organizations (id, tenant_id, name) values (org1, W, 'Client one'), (org2, W, 'Client two');
  insert into public.organization_members (organization_id, user_id, role) values (org1, C, 'client_member'), (org2, D, 'client_member');
  insert into public.projects (id, tenant_id, organization_id, name) values (p1, W, org1, 'Client one site');
  insert into public.project_files (id, tenant_id, project_id, storage_path, file_name, mime_type, size_bytes, is_internal, uploaded_by, uploaded_by_kind) values
    (f_public, W, p1, 'test/public.pdf', 'logo-brief.pdf', 'application/pdf', 1000, false, A, 'staff'),
    (f_internal, W, p1, 'test/internal.pdf', 'margin-notes.pdf', 'application/pdf', 1000, true, A, 'staff');

  select not public into bucket_public from storage.buckets where id = 'project-files';
  report := report || format(E'%s the project files bucket is private (got private=%s)\n', case when bucket_public then 'PASS' else 'FAIL' end, bucket_public);

  perform set_config('request.jwt.claims', json_build_object('sub', C, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.project_files;
  report := report || format(E'%s client sees only the customer-visible file (got %s, want 1)\n', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from public.project_files where is_internal;
  report := report || format(E'%s client cannot see internal files (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  begin
    insert into public.project_files (tenant_id, project_id, storage_path, file_name, mime_type, size_bytes, is_internal, uploaded_by, uploaded_by_kind)
      values (W, p1, 'test/client.pdf', 'photos.pdf', 'application/pdf', 500, false, C, 'client');
    report := report || E'PASS client can upload a file to their own project\n';
  exception when insufficient_privilege then
    report := report || E'FAIL client could not upload to their own project\n';
  end;
  begin
    insert into public.project_files (tenant_id, project_id, storage_path, file_name, mime_type, size_bytes, is_internal, uploaded_by, uploaded_by_kind)
      values (W, p1, 'test/client-internal.pdf', 'x.pdf', 'application/pdf', 500, true, C, 'client');
    report := report || E'FAIL client uploaded an internal file\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot upload an internal file\n';
  end;
  begin
    insert into public.project_files (tenant_id, project_id, storage_path, file_name, mime_type, size_bytes, is_internal, uploaded_by, uploaded_by_kind)
      values (W, p1, 'test/spoof.pdf', 'x.pdf', 'application/pdf', 500, false, A, 'client');
    report := report || E'FAIL client uploaded as another person\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot upload as another person\n';
  end;
  begin
    update public.project_files set is_internal = false where id = f_internal;
    report := report || E'FAIL client changed a file record\n';
  exception when insufficient_privilege then
    report := report || E'PASS client cannot change file records\n';
  end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.project_files;
  report := report || format(E'%s other client sees none of org1''s files (got %s, want 0)\n', case when n = 0 then 'PASS' else 'FAIL' end, n);
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  set role authenticated;
  select count(*) into n from public.project_files;
  report := report || format(E'%s staff see all files including internal (got %s, want 3)\n', case when n = 3 then 'PASS' else 'FAIL' end, n);
  reset role;

  raise exception E'FILE TEST RESULTS (rolled back, nothing kept):\n%', report;
end $$;
