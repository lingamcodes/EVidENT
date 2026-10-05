-- Privacy hardening:
-- 1. Other users can no longer read anyone's email (or has_password).
-- 2. Storage buckets can't be listed by everyone (incl. private-event covers).
-- 3. Users can only edit their own profile fields, not email / id / created_at,
--    and account type + onboarding are locked once onboarding is finished.

-- ─── 1. Column-level read access on users ────────────────────────────────
-- RLS still decides which rows; these grants decide which columns.
revoke select on public.users from anon, authenticated;
grant select (id, name, username, avatar_url, bio, city, account_type, created_at, onboarded_at)
  on public.users to authenticated;

-- The signed-in user's own full row (incl. email, has_password).
create function public.get_my_profile()
returns setof public.users
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.users where id = (select auth.uid());
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- ─── 3. Column-level write access on users ───────────────────────────────
revoke update on public.users from anon, authenticated;
grant update (name, username, avatar_url, bio, city, account_type, has_password, onboarded_at)
  on public.users to authenticated;

-- After onboarding, account type and onboarded_at can't be changed through the API.
-- (Switching individual ↔ org later should be a deliberate, separate feature.)
create function public.guard_user_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.onboarded_at is not null then
    new.account_type := old.account_type;
    new.onboarded_at := old.onboarded_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_user_update() from public, anon, authenticated;

create trigger guard_user_update
  before update on public.users
  for each row execute function public.guard_user_update();

-- ─── 2. Storage: no listing other people's files ─────────────────────────
-- Photos still load by their public URL (public buckets don't need a SELECT
-- policy for that). Users keep SELECT on their own folder, which uploads with
-- upsert need.
drop policy "Avatars are readable by signed-in users" on storage.objects;
drop policy "Event covers are readable by signed-in users" on storage.objects;

create policy "Users read their own avatar files" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users read their own cover files" on storage.objects
  for select to authenticated
  using (bucket_id = 'event-covers' and (storage.foldername(name))[1] = (select auth.uid())::text);
