-- Onboarding (designs 10a–10c): profile fields, password flag, avatar storage.

-- ─── Profile fields ──────────────────────────────────────────────────────
alter table public.users
  add column username text unique
    check (username ~ '^[a-z0-9_.]{3,20}$'),
  add column bio text check (char_length(bio) <= 120),
  add column city text default 'Singapore',
  -- Instagram-style: any account can add a password. Supabase doesn't expose
  -- whether one is set, so the app tracks it here (UI hint only, not security).
  add column has_password boolean not null default false,
  -- null = onboarding not finished; the app routes these users to onboarding.
  add column onboarded_at timestamptz;

-- Email sign-ups start with a password; OAuth sign-ups don't.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, avatar_url, has_password)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email'
  );
  return new;
end;
$$;

-- ─── Avatar storage ──────────────────────────────────────────────────────
-- Public read (avatars show everywhere); each user writes only <uid>/…
-- Files are resized to 512px JPEG on the phone, so 1 MB is a generous cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg']);

create policy "Avatars are readable by signed-in users" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy "Users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users replace their own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
