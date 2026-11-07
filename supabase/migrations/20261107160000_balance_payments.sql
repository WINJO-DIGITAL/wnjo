-- Balance payments (Phase 3l). A deposit row is now either the deposit or the balance for an accepted quote. Staff
-- request the balance once the deposit is paid; the client pays it. Browsers can only read these rows.
alter table public.deposits add column kind text not null default 'deposit' check (kind in ('deposit', 'balance'));
alter table public.deposits drop constraint deposits_quote_acceptance_id_key;
alter table public.deposits add constraint deposits_acceptance_kind_key unique (quote_acceptance_id, kind);
