-- Evident initial schema: CLAUDE.md data model + questionnaire tables.
-- Every table has row-level security; the app only ever uses the anon key.

-- ─── Enums ───────────────────────────────────────────────────────────────
create type public.account_type as enum ('individual', 'org');
create type public.follow_status as enum ('pending', 'accepted', 'rejected');
create type public.event_visibility as enum ('public', 'followers', 'private');
create type public.rsvp_status as enum ('yes', 'no', 'maybe');
create type public.media_type as enum ('photo', 'video');
create type public.question_type as enum ('short', 'mc', 'check');

-- ─── Tables ──────────────────────────────────────────────────────────────

-- Profile row for each auth user (created by trigger below).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  avatar_url text,
  account_type public.account_type not null default 'individual',
  created_at timestamptz not null default now()
);

-- Schema only in MVP: no follower gating or approval flow.
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.users (id) on delete cascade,
  follower_id uuid not null references public.users (id) on delete cascade,
  status public.follow_status not null default 'accepted',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (target_id, follower_id),
  check (target_id <> follower_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  date_time timestamptz not null,
  location text,
  cover_image text,
  capacity integer check (capacity > 0), -- null = unlimited
  visibility public.event_visibility not null default 'public', -- 'followers' reserved for v2
  paynow_amount numeric(10, 2) check (paynow_amount >= 0),
  paynow_reference text,
  external_chat_link text,
  created_at timestamptz not null default now()
);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status public.rsvp_status not null default 'yes',
  waitlist_position integer check (waitlist_position > 0),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  uploader_id uuid not null references public.users (id) on delete cascade,
  type public.media_type not null,
  url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  posted_by uuid not null references public.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  related_event_id uuid references public.events (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Questionnaire: hosts ask guests questions when they RSVP.
create table public.event_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  position integer not null default 0,
  text text not null,
  type public.question_type not null default 'mc',
  image_url text,
  created_at timestamptz not null default now()
);

create table public.event_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.event_questions (id) on delete cascade,
  position integer not null default 0,
  label text not null
);

-- One row per answer; checkbox questions get one row per ticked option.
create table public.rsvp_answers (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps (id) on delete cascade,
  question_id uuid not null references public.event_questions (id) on delete cascade,
  option_id uuid references public.event_question_options (id) on delete cascade, -- null for short text
  text_answer text, -- short-text answer, or detail such as allergies
  created_at timestamptz not null default now(),
  check (option_id is not null or text_answer is not null)
);

-- ─── Indexes on foreign keys ─────────────────────────────────────────────
create index follows_follower_id_idx on public.follows (follower_id);
create index events_host_id_idx on public.events (host_id);
create index events_date_time_idx on public.events (date_time);
create index rsvps_user_id_idx on public.rsvps (user_id);
create index media_event_id_idx on public.media (event_id);
create index media_uploader_id_idx on public.media (uploader_id);
create index announcements_event_id_idx on public.announcements (event_id);
create index announcements_posted_by_idx on public.announcements (posted_by);
create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_related_event_id_idx on public.notifications (related_event_id);
create index event_questions_event_id_idx on public.event_questions (event_id);
create index event_question_options_question_id_idx on public.event_question_options (question_id);
create index rsvp_answers_rsvp_id_idx on public.rsvp_answers (rsvp_id);
create index rsvp_answers_question_id_idx on public.rsvp_answers (question_id);
create index rsvp_answers_option_id_idx on public.rsvp_answers (option_id);

-- ─── Profile row on sign-up ──────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS helpers (security definer so policies don't recurse) ────────────

-- Public events, events you host, and events you've RSVPed to.
-- 'followers' is treated as private until follower gating ships (v2).
create function public.can_view_event(target_event_id uuid)
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
        e.visibility = 'public'
        or e.host_id = (select auth.uid())
        or exists (
          select 1 from public.rsvps r
          where r.event_id = e.id and r.user_id = (select auth.uid())
        )
      )
  );
$$;

create function public.is_event_host(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event_id and e.host_id = (select auth.uid())
  );
$$;

-- ─── Row-level security ──────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.follows enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.media enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.event_questions enable row level security;
alter table public.event_question_options enable row level security;
alter table public.rsvp_answers enable row level security;

-- users: profiles are visible to signed-in users; edit only your own.
create policy "Profiles are readable by signed-in users" on public.users
  for select to authenticated using (true);
create policy "Users update their own profile" on public.users
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- follows: readable; you manage only rows where you are the follower.
create policy "Follows are readable by signed-in users" on public.follows
  for select to authenticated using (true);
create policy "Users follow as themselves" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "Users unfollow as themselves" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- events: visible per can_view_event; only the host writes.
create policy "Events are readable when viewable" on public.events
  for select to authenticated using (public.can_view_event(id));
create policy "Users host events as themselves" on public.events
  for insert to authenticated with check (host_id = (select auth.uid()));
create policy "Hosts update their events" on public.events
  for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "Hosts delete their events" on public.events
  for delete to authenticated using (host_id = (select auth.uid()));

-- rsvps: guests manage their own; hosts see and manage their event's list.
create policy "RSVPs readable by the guest and the host" on public.rsvps
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_event_host(event_id));
create policy "Guests RSVP to viewable events" on public.rsvps
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_event(event_id));
create policy "Guests and hosts update RSVPs" on public.rsvps
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_event_host(event_id))
  with check (user_id = (select auth.uid()) or public.is_event_host(event_id));
create policy "Guests and hosts remove RSVPs" on public.rsvps
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_event_host(event_id));

-- media: visible with the event; uploaders manage their own.
create policy "Media readable with the event" on public.media
  for select to authenticated using (public.can_view_event(event_id));
create policy "Users upload media to viewable events" on public.media
  for insert to authenticated
  with check (uploader_id = (select auth.uid()) and public.can_view_event(event_id));
create policy "Uploaders delete their media" on public.media
  for delete to authenticated using (uploader_id = (select auth.uid()));

-- announcements: visible with the event; only the host posts.
create policy "Announcements readable with the event" on public.announcements
  for select to authenticated using (public.can_view_event(event_id));
create policy "Hosts post announcements" on public.announcements
  for insert to authenticated
  with check (posted_by = (select auth.uid()) and public.is_event_host(event_id));
create policy "Hosts update announcements" on public.announcements
  for update to authenticated
  using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "Hosts delete announcements" on public.announcements
  for delete to authenticated using (public.is_event_host(event_id));

-- notifications: private to the recipient; created server-side only.
create policy "Users read their notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users mark their notifications read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- event_questions: visible with the event; only the host edits.
create policy "Questions readable with the event" on public.event_questions
  for select to authenticated using (public.can_view_event(event_id));
create policy "Hosts add questions" on public.event_questions
  for insert to authenticated with check (public.is_event_host(event_id));
create policy "Hosts update questions" on public.event_questions
  for update to authenticated
  using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
create policy "Hosts delete questions" on public.event_questions
  for delete to authenticated using (public.is_event_host(event_id));

-- event_question_options: follow their question's event.
create policy "Options readable with the event" on public.event_question_options
  for select to authenticated
  using (exists (
    select 1 from public.event_questions q
    where q.id = question_id and public.can_view_event(q.event_id)
  ));
create policy "Hosts add options" on public.event_question_options
  for insert to authenticated
  with check (exists (
    select 1 from public.event_questions q
    where q.id = question_id and public.is_event_host(q.event_id)
  ));
create policy "Hosts update options" on public.event_question_options
  for update to authenticated
  using (exists (
    select 1 from public.event_questions q
    where q.id = question_id and public.is_event_host(q.event_id)
  ))
  with check (exists (
    select 1 from public.event_questions q
    where q.id = question_id and public.is_event_host(q.event_id)
  ));
create policy "Hosts delete options" on public.event_question_options
  for delete to authenticated
  using (exists (
    select 1 from public.event_questions q
    where q.id = question_id and public.is_event_host(q.event_id)
  ));

-- rsvp_answers: the guest writes through their own RSVP; guest and host read.
create policy "Answers readable by the guest and the host" on public.rsvp_answers
  for select to authenticated
  using (exists (
    select 1 from public.rsvps r
    where r.id = rsvp_id
      and (r.user_id = (select auth.uid()) or public.is_event_host(r.event_id))
  ));
create policy "Guests answer through their RSVP" on public.rsvp_answers
  for insert to authenticated
  with check (exists (
    select 1
    from public.rsvps r
    join public.event_questions q on q.event_id = r.event_id
    where r.id = rsvp_id and q.id = question_id and r.user_id = (select auth.uid())
  ));
create policy "Guests update their answers" on public.rsvp_answers
  for update to authenticated
  using (exists (
    select 1 from public.rsvps r
    where r.id = rsvp_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1
    from public.rsvps r
    join public.event_questions q on q.event_id = r.event_id
    where r.id = rsvp_id and q.id = question_id and r.user_id = (select auth.uid())
  ));
create policy "Guests delete their answers" on public.rsvp_answers
  for delete to authenticated
  using (exists (
    select 1 from public.rsvps r
    where r.id = rsvp_id and r.user_id = (select auth.uid())
  ));
