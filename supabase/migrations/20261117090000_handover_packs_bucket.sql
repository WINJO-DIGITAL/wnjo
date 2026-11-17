-- The website pack handed to a customer when a website bought outright is handed over: a zip of their wording,
-- photos, colours and fonts. Private, and written and read only by the server through short-lived signed links, so
-- there are no storage policies. The brief bucket can't hold it (it allows images, PDFs and text only, up to 20 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('handover-packs', 'handover-packs', false, 52428800, array['application/zip'])
on conflict (id) do nothing;
