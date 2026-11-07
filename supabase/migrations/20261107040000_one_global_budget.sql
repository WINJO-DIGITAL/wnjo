-- One global AI budget per agency. A unique constraint on (tenant, scope, scope_id) does not stop a second
-- global row, because the scope id is empty and empty values never clash; this index closes that gap.
create unique index if not exists ai_budget_one_global_per_agency
  on public.ai_budget_settings (tenant_id) where scope = 'global';
