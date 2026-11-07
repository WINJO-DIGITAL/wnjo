-- Fixes from the Supabase security advisor (Phase 7). Triggers still run after these changes: PostgreSQL checks the
-- execute privilege of a trigger function only when the trigger is created, not when it fires. Nothing here is
-- callable through the API any more.

revoke execute on function public.notify_on_approval_request() from public, anon, authenticated;
revoke execute on function public.notify_on_staff_message() from public, anon, authenticated;

alter function public.forbid_change() set search_path = '';
