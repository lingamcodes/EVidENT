-- Account checker for the sign-up / log-in / forgot-password screens:
-- tells the app whether an email already has an account and how it signs in,
-- so it can say "log in instead" or "this account uses Google".
--
-- Trade-off: anyone can ask whether an email is registered (like Instagram's
-- "this email is already in use"). Only booleans are returned, never ids or names.

create function public.check_account(lookup_email text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with target as (
    select u.id, u.email_confirmed_at, u.encrypted_password
    from auth.users u
    where lower(u.email) = lower(trim(lookup_email))
    limit 1
  )
  select json_build_object(
    'exists', exists (select 1 from target),
    'confirmed', coalesce((select email_confirmed_at is not null from target), false),
    'has_password', coalesce((select coalesce(encrypted_password, '') <> '' from target), false),
    'has_google', exists (
      select 1 from auth.identities i
      join target t on t.id = i.user_id
      where i.provider = 'google'
    )
  );
$$;

revoke execute on function public.check_account(text) from public;
grant execute on function public.check_account(text) to anon, authenticated;
