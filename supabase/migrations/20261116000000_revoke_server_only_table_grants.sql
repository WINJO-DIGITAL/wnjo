-- Four server-only tables had row-level security on with no policies, so browsers could read nothing, but the tables
-- still carried the default grants to the browser roles. Take them away, as the other three server-only tables
-- already do, so a future policy mistake can't expose them. The server uses the service role, which is unaffected.
revoke all on public.site_domains from anon, authenticated;
revoke all on public.site_enquiries from anon, authenticated;
revoke all on public.template_test_ratings from anon, authenticated;
revoke all on public.template_test_runs from anon, authenticated;
