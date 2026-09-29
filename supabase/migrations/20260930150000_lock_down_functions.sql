-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- directly, so "revoke … from public" alone left them callable over the API.
--
-- Intentionally callable signed out: check_account, get_invite_preview.
-- Helpers used inside RLS policies (can_view_event, is_event_host,
-- can_invite_to_event) must stay executable by authenticated, because
-- policies run as the querying user; they only answer yes/no.

revoke execute on function public.join_event_by_code(text) from anon;
revoke execute on function public.save_event(jsonb, jsonb) from anon;

revoke execute on function public.can_view_event(uuid) from anon;
revoke execute on function public.is_event_host(uuid) from anon;
revoke execute on function public.can_invite_to_event(uuid) from anon;

-- Column default for events.invite_code; evaluated as the inserting (signed-in) user.
revoke execute on function public.generate_invite_code() from anon;

-- Trigger function: triggers don't need the caller to hold EXECUTE.
revoke execute on function public.handle_new_user() from anon, authenticated;
