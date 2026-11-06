-- Seeds WNJO's current provisional prices (from src/lib/pricing.ts, converted to pence).
do $$
declare
  W uuid := '00000000-0000-4000-8000-000000000001';
begin
  insert into public.pricing_packages (tenant_id, code, name, summary, base_price_pence, page_limit, included_design, includes, sort_order) values
    (W, 'essential', 'Essential', 'A polished, professional web presence.', 180000, 5, 'refined',
      array['Up to 5 pages','Bespoke visual direction','Responsive build for mobile, tablet and desktop','Enquiry form','Technical SEO foundations','Two rounds of design revisions','Launch and 30 days of handover support'], 1),
    (W, 'professional', 'Professional', 'A fuller marketing site with richer presentation.', 380000, 12, 'refined',
      array['Up to 12 pages','Custom layouts for key pages','Service and project presentation','Content management','Analytics set-up','Three rounds of design revisions','Launch and 30 days of handover support'], 2),
    (W, 'premium', 'Premium', 'A distinctive experience or more advanced functionality.', 750000, 25, 'distinctive',
      array['Up to 25 pages','Extensive custom design and interaction','Complex page structures','Content management','Integration planning','Extended cross-browser and accessibility testing','Launch and 60 days of handover support'], 3);

  insert into public.pricing_features (tenant_id, code, label, hint, price_pence, requires_scope, included_in_packages, sort_order) values
    (W, 'cms', 'Content management', 'Edit pages and posts yourself without a developer.', 60000, false, array['professional','premium'], 1),
    (W, 'payments', 'Online payments', 'Take deposits or one-off payments through a payment provider.', 50000, false, '{}', 2),
    (W, 'booking', 'Booking functionality', 'Availability, appointments and confirmations.', 150000, false, '{}', 3),
    (W, 'ecommerce', 'E-commerce catalogue', 'Products, basket, checkout and order management.', 250000, false, '{}', 4),
    (W, 'accounts', 'Customer accounts', 'Sign-in areas for your customers.', 120000, true, '{}', 5),
    (W, 'integrations', 'Third-party integrations', 'Connect a CRM, mailing list, calendar or other service.', 60000, true, '{}', 6),
    (W, 'custom', 'Custom features', 'Something specific to your business. Describe it later.', 0, true, '{}', 7);

  insert into public.pricing_rates (tenant_id, kind, code, band, amount_pence) values
    (W, 'copy_editing', 'editing', '1-5', 35000),
    (W, 'copy_editing', 'editing', '6-12', 70000),
    (W, 'copy_editing', 'editing', '13-25', 130000),
    (W, 'copy_writing', 'writing', '1-5', 75000),
    (W, 'copy_writing', 'writing', '6-12', 150000),
    (W, 'copy_writing', 'writing', '13-25', 280000),
    (W, 'imagery', 'sourced', null, 25000),
    (W, 'branding', 'partial', null, 30000),
    (W, 'branding', 'none', null, 65000),
    (W, 'design', 'refined', null, 0),
    (W, 'design', 'distinctive', null, 90000),
    (W, 'design', 'signature', null, 240000);

  insert into public.pricing_care_plans (tenant_id, code, name, summary, monthly_price_pence, includes, sort_order) values
    (W, 'none', 'No plan', 'We hand the site over to your own hosting.', 0, '{}', 1),
    (W, 'hosting', 'Hosting', 'Managed hosting for your site.', 2500, array['Managed hosting','SSL certificate','Daily backups','Uptime monitoring'], 2),
    (W, 'care', 'Care', 'Hosting plus routine maintenance and small changes.', 7500, array['Everything in Hosting','Routine updates','Up to 1 hour of small content changes per month','Email support, replies within 2 working days'], 3),
    (W, 'carePlus', 'Care Plus', 'For sites that change often or carry more functionality.', 18000, array['Everything in Care','Up to 3 hours of changes or improvements per month','Quarterly performance and accessibility review','Email support, replies within 1 working day'], 4);

  insert into public.pricing_settings (tenant_id, key, value) values
    (W, 'soon_premium_bp', 1500),
    (W, 'range_spread_bp', 2000),
    (W, 'rounding_step_pence', 5000);
end $$;
