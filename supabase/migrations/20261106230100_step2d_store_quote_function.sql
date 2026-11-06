-- Stores a new quote, its first version and its line items in one transaction.
-- Callable only with the server's secret key (service_role). Browser roles cannot call it.
create or replace function public.store_quote(p_quote jsonb, p_version jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := (p_quote->>'tenant_id')::uuid;
  v_quote_id uuid;
  v_version_id uuid;
begin
  if (p_version->>'tenant_id')::uuid <> v_tenant then
    raise exception 'tenant mismatch between quote and version' using errcode = '22023';
  end if;

  insert into public.quotes (tenant_id, reference, organization_id, enquiry_id, status, expires_at, latest_version)
  values (
    v_tenant,
    p_quote->>'reference',
    nullif(p_quote->>'organization_id', '')::uuid,
    nullif(p_quote->>'enquiry_id', '')::uuid,
    'sent',
    (p_quote->>'expires_at')::timestamptz,
    1
  )
  returning id into v_quote_id;

  insert into public.quote_versions (
    tenant_id, quote_id, version, answers, catalogue_snapshot, package_code,
    build_pence, range_low_pence, range_high_pence, monthly_pence, requires_scope, scope_reasons
  ) values (
    v_tenant,
    v_quote_id,
    1,
    p_version->'answers',
    p_version->'catalogue_snapshot',
    p_version->>'package_code',
    (p_version->>'build_pence')::integer,
    (p_version->>'range_low_pence')::integer,
    (p_version->>'range_high_pence')::integer,
    (p_version->>'monthly_pence')::integer,
    (p_version->>'requires_scope')::boolean,
    coalesce(array(select jsonb_array_elements_text(p_version->'scope_reasons')), '{}')
  )
  returning id into v_version_id;

  insert into public.quote_version_items (tenant_id, quote_version_id, position, label, amount_pence)
  select v_tenant, v_version_id, (i->>'position')::integer, i->>'label', (i->>'amount_pence')::integer
  from jsonb_array_elements(p_items) as i;

  return v_quote_id;
end;
$$;

revoke execute on function public.store_quote(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.store_quote(jsonb, jsonb, jsonb) to service_role;
