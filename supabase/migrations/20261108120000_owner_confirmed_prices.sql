-- Owner-confirmed prices, 8 November 2026 (amounts in pence). Matches src/lib/pricing.ts.
-- Issued quotes keep the prices frozen in their quote_versions snapshot; only new quotes use these.
update public.pricing_packages p
set base_price_pence = v.pence
from (values ('essential', 240000), ('professional', 450000), ('premium', 850000)) as v(code, pence),
     public.tenants t
where p.code = v.code and p.tenant_id = t.id and t.slug = 'wnjo';

update public.pricing_care_plans c
set monthly_price_pence = v.pence
from (values ('care', 9500), ('carePlus', 22000)) as v(code, pence),
     public.tenants t
where c.code = v.code and c.tenant_id = t.id and t.slug = 'wnjo';
