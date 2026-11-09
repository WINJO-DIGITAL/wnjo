-- The date the team expects a website to be ready for the customer's next step. Set by staff, shown to the customer.
alter table public.website_briefs add column if not exists expected_by date null;
