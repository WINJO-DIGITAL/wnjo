alter table public.pricing_features add column scope_note text not null default '';
update public.pricing_features set scope_note = case code
  when 'accounts' then 'Customer accounts depend on your data and security needs.'
  when 'integrations' then 'Integrations depend on the services involved.'
  when 'custom' then 'Custom features are priced once we understand them.'
  else '' end
where tenant_id = '00000000-0000-4000-8000-000000000001';
