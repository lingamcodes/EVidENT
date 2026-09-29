-- Postgres also grants EXECUTE to PUBLIC by default, which anon inherits.
-- Remove that for internal helpers; authenticated keeps its explicit grant.
revoke execute on function public.can_view_event(uuid) from public;
revoke execute on function public.is_event_host(uuid) from public;
revoke execute on function public.can_invite_to_event(uuid) from public;
revoke execute on function public.generate_invite_code() from public;
revoke execute on function public.handle_new_user() from public;
