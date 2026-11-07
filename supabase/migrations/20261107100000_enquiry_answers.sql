-- Enquiries (Phase 3k). Brief enquiries keep the validated answers, so staff can price a quote from them. Only the
-- server writes enquiries (see the enquiry route); the answers are readable by staff through the existing policies.
alter table public.enquiries add column answers jsonb;
