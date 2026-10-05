-- Event creation (design 5b): drafts, extra fields, private invites,
-- one-transaction save, invite links and a public invite preview.

-- ─── Events: new fields ──────────────────────────────────────────────────
create function public.generate_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 12 hex chars from a v4 UUID (cryptographically random), e.g. 'A1B2C3D4E5F6'.
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
$$;

-- Drafts may be saved with just a title; published events need a start and a place.
alter table public.events alter column date_time drop not null;

alter table public.events
  add column ends_at timestamptz,
  add column rsvp_by timestamptz,
  add column map_link text,
  add column status text not null default 'draft' check (status in ('draft', 'published')),
  add column allow_guest_invites boolean not null default false,
  add column invite_code text not null unique default public.generate_invite_code(),
  add column updated_at timestamptz not null default now(),
  add constraint events_published_complete
    check (status = 'draft' or (date_time is not null and coalesce(location, '') <> '')),
  add constraint events_ends_after_start
    check (ends_at is null or date_time is null or ends_at > date_time),
  add constraint events_rsvp_before_start
    check (rsvp_by is null or date_time is null or rsvp_by <= date_time);

-- ─── Private-event invites ───────────────────────────────────────────────
create table public.event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invitee_id uuid not null references public.users (id) on delete cascade,
  invited_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, invitee_id)
);
create index event_invites_invitee_id_idx on public.event_invites (invitee_id);
create index event_invites_invited_by_idx on public.event_invites (invited_by);

-- ─── Visibility: drafts host-only; private = host, invitees, RSVPs ───────
create or replace function public.can_view_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and (
        e.host_id = (select auth.uid())
        or (
          e.status = 'published'
          and (
            e.visibility = 'public'
            or exists (
              select 1 from public.rsvps r
              where r.event_id = e.id and r.user_id = (select auth.uid())
            )
            or exists (
              select 1 from public.event_invites i
              where i.event_id = e.id and i.invitee_id = (select auth.uid())
            )
          )
        )
      )
  );
$$;

-- Host always; guests only when the host allows it and they're invited or going.
create function public.can_invite_to_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event_id
      and (
        e.host_id = (select auth.uid())
        or (
          e.status = 'published'
          and e.allow_guest_invites
          and (
            exists (
              select 1 from public.event_invites i
              where i.event_id = e.id and i.invitee_id = (select auth.uid())
            )
            or exists (
              select 1 from public.rsvps r
              where r.event_id = e.id and r.user_id = (select auth.uid())
            )
          )
        )
      )
  );
$$;

alter table public.event_invites enable row level security;

create policy "Invites readable by invitee, inviter and host" on public.event_invites
  for select to authenticated
  using (
    invitee_id = (select auth.uid())
    or invited_by = (select auth.uid())
    or public.is_event_host(event_id)
  );
create policy "Allowed users invite as themselves" on public.event_invites
  for insert to authenticated
  with check (invited_by = (select auth.uid()) and public.can_invite_to_event(event_id));
create policy "Host or inviter removes invites" on public.event_invites
  for delete to authenticated
  using (invited_by = (select auth.uid()) or public.is_event_host(event_id));

-- ─── save_event: event + questionnaire in one transaction ────────────────
-- Runs as the caller, so RLS still applies. Questions/options are updated in
-- place by id; only ones removed in the form are deleted (keeps guests' answers).
create function public.save_event(p_event jsonb, p_questions jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  event_id uuid := nullif(p_event ->> 'id', '')::uuid;
  question jsonb;
  question_id uuid;
  opt jsonb;
  option_id uuid;
  kept_questions uuid[] := '{}';
  kept_options uuid[];
  q_pos integer := 0;
  o_pos integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to save events';
  end if;

  if event_id is null then
    insert into public.events (
      host_id, title, description, date_time, ends_at, rsvp_by, location, map_link,
      cover_image, capacity, visibility, status, allow_guest_invites
    ) values (
      (select auth.uid()),
      p_event ->> 'title',
      nullif(p_event ->> 'description', ''),
      nullif(p_event ->> 'date_time', '')::timestamptz,
      nullif(p_event ->> 'ends_at', '')::timestamptz,
      nullif(p_event ->> 'rsvp_by', '')::timestamptz,
      nullif(p_event ->> 'location', ''),
      nullif(p_event ->> 'map_link', ''),
      nullif(p_event ->> 'cover_image', ''),
      nullif(p_event ->> 'capacity', '')::integer,
      coalesce(nullif(p_event ->> 'visibility', ''), 'public')::public.event_visibility,
      coalesce(nullif(p_event ->> 'status', ''), 'draft'),
      coalesce((p_event ->> 'allow_guest_invites')::boolean, false)
    )
    returning id into event_id;
  else
    update public.events set
      title = p_event ->> 'title',
      description = nullif(p_event ->> 'description', ''),
      date_time = nullif(p_event ->> 'date_time', '')::timestamptz,
      ends_at = nullif(p_event ->> 'ends_at', '')::timestamptz,
      rsvp_by = nullif(p_event ->> 'rsvp_by', '')::timestamptz,
      location = nullif(p_event ->> 'location', ''),
      map_link = nullif(p_event ->> 'map_link', ''),
      cover_image = nullif(p_event ->> 'cover_image', ''),
      capacity = nullif(p_event ->> 'capacity', '')::integer,
      visibility = coalesce(nullif(p_event ->> 'visibility', ''), 'public')::public.event_visibility,
      status = coalesce(nullif(p_event ->> 'status', ''), 'draft'),
      allow_guest_invites = coalesce((p_event ->> 'allow_guest_invites')::boolean, false),
      updated_at = now()
    where id = event_id and host_id = (select auth.uid());
    if not found then
      raise exception 'Event not found, or you are not its host';
    end if;
  end if;

  for question in select * from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    question_id := null;
    if coalesce(question ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
      update public.event_questions set
        position = q_pos,
        text = question ->> 'text',
        type = (question ->> 'type')::public.question_type,
        image_url = nullif(question ->> 'image_url', '')
      where id = (question ->> 'id')::uuid and event_questions.event_id = save_event.event_id
      returning id into question_id;
    end if;
    if question_id is null then
      insert into public.event_questions (event_id, position, text, type, image_url)
      values (
        save_event.event_id, q_pos, question ->> 'text',
        (question ->> 'type')::public.question_type, nullif(question ->> 'image_url', '')
      )
      returning id into question_id;
    end if;
    kept_questions := kept_questions || question_id;

    kept_options := '{}';
    o_pos := 0;
    for opt in select * from jsonb_array_elements(coalesce(question -> 'options', '[]'::jsonb)) loop
      option_id := null;
      if coalesce(opt ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
        update public.event_question_options set position = o_pos, label = opt ->> 'label'
        where id = (opt ->> 'id')::uuid and event_question_options.question_id = save_event.question_id
        returning id into option_id;
      end if;
      if option_id is null then
        insert into public.event_question_options (question_id, position, label)
        values (question_id, o_pos, opt ->> 'label')
        returning id into option_id;
      end if;
      kept_options := kept_options || option_id;
      o_pos := o_pos + 1;
    end loop;
    delete from public.event_question_options
      where event_question_options.question_id = save_event.question_id
        and not (id = any (kept_options));

    q_pos := q_pos + 1;
  end loop;

  delete from public.event_questions
    where event_questions.event_id = save_event.event_id and not (id = any (kept_questions));

  return event_id;
end;
$$;

-- ─── Invite links ────────────────────────────────────────────────────────
-- Joining by code adds the caller as an invitee (so private events become visible).
create function public.join_event_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to join events';
  end if;

  select e.id, e.host_id into target
  from public.events e
  where e.invite_code = upper(trim(code)) and e.status = 'published';

  if not found then
    raise exception 'That invite link is not valid (it may have been deleted)';
  end if;

  if target.host_id <> (select auth.uid()) then
    insert into public.event_invites (event_id, invitee_id, invited_by)
    values (target.id, (select auth.uid()), target.host_id)
    on conflict (event_id, invitee_id) do nothing;
  end if;

  return target.id;
end;
$$;

-- What anyone holding the link may see (also signed out, for the web page):
-- title, host, when, where, cover. Never guests, invitees or media.
create function public.get_invite_preview(code text)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'title', e.title,
    'host_name', u.name,
    'host_avatar_url', u.avatar_url,
    'date_time', e.date_time,
    'ends_at', e.ends_at,
    'location', e.location,
    'cover_image', e.cover_image,
    'visibility', e.visibility
  )
  from public.events e
  join public.users u on u.id = e.host_id
  where e.invite_code = upper(trim(code)) and e.status = 'published';
$$;

revoke execute on function public.save_event(jsonb, jsonb) from public;
grant execute on function public.save_event(jsonb, jsonb) to authenticated;
revoke execute on function public.join_event_by_code(text) from public;
grant execute on function public.join_event_by_code(text) to authenticated;
revoke execute on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- ─── Cover photos ────────────────────────────────────────────────────────
-- Resized to 1600px JPEG on the phone; 2 MB is a generous cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', true, 2097152, array['image/jpeg']);

create policy "Event covers are readable by signed-in users" on storage.objects
  for select to authenticated
  using (bucket_id = 'event-covers');

create policy "Users upload covers to their folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users replace covers in their folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete covers in their folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
