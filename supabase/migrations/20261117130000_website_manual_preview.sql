-- A website the owner built by hand is shown to the customer as an https address the owner pastes in. The customer sees it
-- as their preview, from their own account, and can approve it or ask for changes like any other preview. Written only by
-- the server (an owner or admin releasing it); the address is https only.
alter table public.website_briefs
  add column if not exists manual_preview_url text check (manual_preview_url is null or (manual_preview_url ~ '^https://[^[:space:]]+$' and char_length(manual_preview_url) <= 500)),
  add column if not exists manual_preview_at timestamptz;

comment on column public.website_briefs.manual_preview_url is 'The https address of a hand-built preview, shown to the customer in their account. Null when none is with the customer.';
