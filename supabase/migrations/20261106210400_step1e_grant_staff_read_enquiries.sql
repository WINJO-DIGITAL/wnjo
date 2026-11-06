grant select on public.enquiries, public.orders, public.order_updates to authenticated;
-- Row-level security limits each signed-in person to rows their tenant or organisation allows.
-- Browser roles still cannot insert, delete or change enquiries directly.
revoke insert, delete on public.enquiries from authenticated;
