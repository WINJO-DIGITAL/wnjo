-- Seeds the five agents for WNJO, all switched off, and a global AI budget of zero.
insert into public.ai_agents (tenant_id, agent_key, name, enabled, paused) values
  ('00000000-0000-4000-8000-000000000001', 'project_manager', 'Project manager', false, false),
  ('00000000-0000-4000-8000-000000000001', 'developer', 'Developer', false, false),
  ('00000000-0000-4000-8000-000000000001', 'qa_engineer', 'QA engineer', false, false),
  ('00000000-0000-4000-8000-000000000001', 'client_success', 'Client success', false, false),
  ('00000000-0000-4000-8000-000000000001', 'operations_manager', 'Operations manager', false, false)
on conflict (tenant_id, agent_key) do nothing;

insert into public.ai_budget_settings (tenant_id, scope, scope_id, monthly_limit_pence, warn_at_pence)
values ('00000000-0000-4000-8000-000000000001', 'global', null, 0, 0)
on conflict (tenant_id, scope, scope_id) do nothing;
