-- A website bought outright is paid in two parts: a 50% deposit to start, and the balance once the customer has approved
-- the website. These two dates record the balance being paid and the website being handed over to the customer.
-- Both are only ever set by the server (the Stripe webhook and the staff handover action).
alter table public.website_briefs add column if not exists balance_paid_at timestamptz;
alter table public.website_briefs add column if not exists handed_over_at timestamptz;
