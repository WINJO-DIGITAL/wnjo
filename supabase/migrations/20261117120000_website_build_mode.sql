-- How new websites are made. "auto": the AI plans, picks a template and builds a draft as soon as the customer sends
-- their goals. "manual": nothing is built automatically; the owner is told, and builds the website themselves from a
-- brief they can copy. One setting for the agency, changed only by an owner or admin through the server.
alter table public.tenant_settings
  add column if not exists website_build_mode text not null default 'auto'
  check (website_build_mode in ('auto', 'manual'));

comment on column public.tenant_settings.website_build_mode is 'auto: the AI drafts new websites. manual: the owner builds them; the AI waits.';
