-- The customer's answer to "Your website address": they already have an address, or want help getting one.
-- Written only by the server, through the customer's own signed-in route; staff read it with their existing rights.
alter table public.website_briefs
  add column if not exists domain_choice text check (domain_choice in ('have', 'help')),
  add column if not exists domain_name text check (domain_name is null or char_length(domain_name) between 4 and 253),
  add column if not exists domain_answered_at timestamptz;
