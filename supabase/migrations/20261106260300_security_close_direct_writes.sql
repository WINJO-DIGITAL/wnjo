-- Anonymous visitors get no table access at all; row-level security would deny them anyway.
revoke select on all tables in schema public from anon;

-- Projects are created by the server, not from the browser.
revoke insert on public.projects from authenticated;

-- A quote's status changes only through accept_quote and decline_quote, so acceptance evidence always exists.
revoke update on public.quotes from authenticated;
grant update (expires_at) on public.quotes to authenticated;

-- Staff change only an order's stage, never who it belongs to.
revoke update on public.orders from authenticated;
grant update (stage, stage_updated_at) on public.orders to authenticated;

-- Enquiries and order updates are read-only from the browser.
revoke update on public.enquiries from authenticated;
revoke update on public.order_updates from authenticated;
