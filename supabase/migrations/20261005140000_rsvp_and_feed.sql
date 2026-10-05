-- RSVPs (4c / 4e) and the Home feed (6b).
-- RLS keeps other people's RSVPs private, so everything that needs counts or
-- friends' activity goes through security-definer functions that first check
-- what the caller is allowed to see (can_view_event), and return only that.

alter table public.rsvps add column updated_at timestamptz not null default now();

-- ─── set_rsvp: the only way RSVPs are written ────────────────────────────
-- p_status: 'yes' | 'maybe' | 'no', or null to clear (Undo).
-- Enforces: visible + published, not your own event, RSVP-by deadline,
-- not yet started/ended, capacity (extra "yes" joins the waitlist) and
-- promotes the first waitlisted guest when a going guest leaves.
create function public.set_rsvp(p_event_id uuid, p_status public.rsvp_status)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_event record;
  v_existing record;
  v_had_rsvp boolean;
  v_was_going boolean;
  v_going integer;
  v_wait integer;
  v_mine record;
begin
  if v_uid is null then
    raise exception 'Sign in to RSVP';
  end if;
  if not public.can_view_event(p_event_id) then
    raise exception 'Event not found';
  end if;

  -- Lock the event row so two people can't take the last spot at once.
  select id, host_id, status, capacity, rsvp_by, date_time, ends_at
    into v_event
    from public.events where id = p_event_id
    for update;

  if v_event.status <> 'published' then
    raise exception 'This event is not published yet';
  end if;
  if v_event.host_id = v_uid then
    raise exception 'You are hosting this event';
  end if;
  -- Joining (yes / maybe) closes at the deadline or once the event starts;
  -- declining or clearing is always allowed.
  if p_status in ('yes', 'maybe') then
    if v_event.rsvp_by is not null and now() > v_event.rsvp_by then
      raise exception 'RSVPs for this event have closed';
    end if;
    if v_event.date_time is not null and now() > v_event.date_time then
      raise exception 'This event has already started';
    end if;
  end if;

  select * into v_existing from public.rsvps where event_id = p_event_id and user_id = v_uid;
  v_had_rsvp := found;
  v_was_going := v_had_rsvp and v_existing.status = 'yes' and v_existing.waitlist_position is null;

  if p_status is null then
    delete from public.rsvps where event_id = p_event_id and user_id = v_uid;
  elsif p_status = 'yes' then
    if not (v_had_rsvp and v_existing.status = 'yes') then
      select count(*) into v_going
        from public.rsvps
        where event_id = p_event_id and status = 'yes' and waitlist_position is null;
      v_wait := null;
      if v_event.capacity is not null and v_going >= v_event.capacity then
        select coalesce(max(waitlist_position), 0) + 1 into v_wait
          from public.rsvps
          where event_id = p_event_id and waitlist_position is not null;
      end if;
      insert into public.rsvps (event_id, user_id, status, waitlist_position)
      values (p_event_id, v_uid, 'yes', v_wait)
      on conflict (event_id, user_id)
        do update set status = 'yes', waitlist_position = excluded.waitlist_position, updated_at = now();
    end if;
  else
    insert into public.rsvps (event_id, user_id, status, waitlist_position)
    values (p_event_id, v_uid, p_status, null)
    on conflict (event_id, user_id)
      do update set status = excluded.status, waitlist_position = null, updated_at = now();
  end if;

  -- A going spot opened up: move the first waitlisted guest in.
  if v_was_going and (p_status is null or p_status <> 'yes') then
    update public.rsvps set waitlist_position = null, updated_at = now()
    where id = (
      select id from public.rsvps
      where event_id = p_event_id and waitlist_position is not null
      order by waitlist_position
      limit 1
    );
  end if;

  select status, waitlist_position into v_mine
    from public.rsvps where event_id = p_event_id and user_id = v_uid;
  if not found then
    return json_build_object('status', null, 'waitlisted', false, 'waitlist_rank', null);
  end if;
  return json_build_object(
    'status', v_mine.status,
    'waitlisted', v_mine.waitlist_position is not null,
    'waitlist_rank', case when v_mine.waitlist_position is null then null else (
      select count(*) from public.rsvps
      where event_id = p_event_id and waitlist_position is not null
        and waitlist_position <= v_mine.waitlist_position
    ) end
  );
end;
$$;

-- ─── save_rsvp_answers: the guest's questionnaire answers ───────────────
-- Runs as the caller (RLS: only your own RSVP, only this event's questions).
-- p_answers: [{ question_id, option_id?, text_answer? }, …] — replaces all.
create function public.save_rsvp_answers(p_event_id uuid, p_answers jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rsvp uuid;
  v_answer jsonb;
  v_question uuid;
  v_option uuid;
begin
  select id into v_rsvp from public.rsvps
    where event_id = p_event_id and user_id = (select auth.uid());
  if v_rsvp is null then
    raise exception 'RSVP to the event before answering its questions';
  end if;

  delete from public.rsvp_answers where rsvp_id = v_rsvp;

  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    v_question := (v_answer ->> 'question_id')::uuid;
    v_option := nullif(v_answer ->> 'option_id', '')::uuid;
    if not exists (select 1 from public.event_questions where id = v_question and event_id = p_event_id) then
      raise exception 'That question is not part of this event';
    end if;
    if v_option is not null and not exists (
      select 1 from public.event_question_options where id = v_option and question_id = v_question
    ) then
      raise exception 'That option is not part of this question';
    end if;
    insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
    values (v_rsvp, v_question, v_option, nullif(trim(v_answer ->> 'text_answer'), ''));
  end loop;
end;
$$;

-- ─── get_event_social: counts + "people you follow" + my RSVP state ──────
create function public.get_event_social(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select case when not public.can_view_event(p_event_id) then null else (
    select json_build_object(
      'going_count', (select count(*) from public.rsvps
                      where event_id = e.id and status = 'yes' and waitlist_position is null),
      'waitlist_count', (select count(*) from public.rsvps
                         where event_id = e.id and waitlist_position is not null),
      'followed_going_count', (
        select count(*) from public.rsvps r
        join public.follows f on f.target_id = r.user_id and f.follower_id = (select auth.uid())
        where r.event_id = e.id and r.status = 'yes' and r.waitlist_position is null),
      'followed_going', coalesce((
        select json_agg(json_build_object('id', x.id, 'name', x.name, 'avatar_url', x.avatar_url))
        from (
          select u.id, u.name, u.avatar_url
          from public.rsvps r
          join public.follows f on f.target_id = r.user_id and f.follower_id = (select auth.uid())
          join public.users u on u.id = r.user_id
          where r.event_id = e.id and r.status = 'yes' and r.waitlist_position is null
          order by r.updated_at desc
          limit 3
        ) x), '[]'::json),
      'my_status', (select r.status from public.rsvps r where r.event_id = e.id and r.user_id = (select auth.uid())),
      'my_waitlist_rank', (
        select count(*) from public.rsvps w, public.rsvps me
        where me.event_id = e.id and me.user_id = (select auth.uid()) and me.waitlist_position is not null
          and w.event_id = e.id and w.waitlist_position is not null
          and w.waitlist_position <= me.waitlist_position),
      'rsvp_open', (
        e.status = 'published'
        and (e.rsvp_by is null or now() <= e.rsvp_by)
        and (e.date_time is null or now() <= e.date_time)),
      'has_questions', exists (select 1 from public.event_questions q where q.event_id = e.id)
    )
    from public.events e where e.id = p_event_id
  ) end;
$$;

-- ─── get_home_feed: what people you follow are up to ─────────────────────
-- "going" only for PUBLIC events (no per-user privacy setting until v2);
-- "hosting" only for events you can see; newest first, capped.
create function public.get_home_feed(p_limit integer default 30)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  followed as (select f.target_id as id from public.follows f, me where f.follower_id = me.id),
  items as (
    select r.updated_at as at, r.user_id as actor_id, 'going' as verb,
           e.id as event_id, e.title as target, e.cover_image as thumb, null::uuid as target_user_id
    from public.rsvps r
    join followed fo on fo.id = r.user_id
    join public.events e on e.id = r.event_id
    where r.status = 'yes' and r.waitlist_position is null
      and e.status = 'published' and e.visibility = 'public'
    union all
    select e.created_at, e.host_id, 'hosting', e.id, e.title, e.cover_image, null
    from public.events e
    join followed fo on fo.id = e.host_id
    where e.status = 'published' and public.can_view_event(e.id)
    union all
    select f2.created_at, f2.follower_id, 'followed', null, t.name, t.avatar_url, t.id
    from public.follows f2
    join followed fo on fo.id = f2.follower_id
    join public.users t on t.id = f2.target_id
  )
  select coalesce(json_agg(json_build_object(
           'at', i.at, 'verb', i.verb, 'event_id', i.event_id, 'target', i.target,
           'thumb', i.thumb, 'target_user_id', i.target_user_id,
           'actor_id', a.id, 'actor_name', a.name, 'actor_avatar_url', a.avatar_url)
         order by i.at desc), '[]'::json)
  from (select * from items order by at desc limit least(greatest(p_limit, 1), 50)) i
  join public.users a on a.id = i.actor_id;
$$;

-- ─── get_my_invites: invites to upcoming published events ───────────────
create function public.get_my_invites()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x.date_time nulls last), '[]'::json)
  from (
    select e.id as event_id, e.title, e.date_time, e.location, e.cover_image,
           u.name as inviter_name, u.avatar_url as inviter_avatar_url,
           (select count(*) from public.rsvps r
            join public.follows f on f.target_id = r.user_id and f.follower_id = (select auth.uid())
            where r.event_id = e.id and r.status = 'yes' and r.waitlist_position is null) as friends_going,
           exists (select 1 from public.event_questions q where q.event_id = e.id) as has_questions,
           (select r.status from public.rsvps r where r.event_id = e.id and r.user_id = (select auth.uid())) as my_status
    from public.event_invites i
    join public.events e on e.id = i.event_id
    join public.users u on u.id = i.invited_by
    where i.invitee_id = (select auth.uid())
      and e.status = 'published'
      and e.host_id <> (select auth.uid())
      and (coalesce(e.ends_at, e.date_time) is null or coalesce(e.ends_at, e.date_time) > now())
  ) x;
$$;

-- ─── get_my_going: events you said yes to, soonest first ────────────────
create function public.get_my_going()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x.date_time nulls last), '[]'::json)
  from (
    select e.id as event_id, e.title, e.date_time, e.ends_at, e.location, e.cover_image,
           r.waitlist_position is not null as waitlisted,
           (select count(*) from public.rsvps g
            where g.event_id = e.id and g.status = 'yes' and g.waitlist_position is null) as going_count
    from public.rsvps r
    join public.events e on e.id = r.event_id
    where r.user_id = (select auth.uid())
      and r.status = 'yes'
      and e.status = 'published'
      and (coalesce(e.ends_at, e.date_time) is null or coalesce(e.ends_at, e.date_time) > now())
  ) x;
$$;

-- RSVPs are written only through set_rsvp (capacity/deadline rules), so remove
-- direct insert/update by guests. Hosts keep update/delete (guest management).
drop policy "Guests RSVP to viewable events" on public.rsvps;
drop policy "Guests and hosts update RSVPs" on public.rsvps;
create policy "Hosts update RSVPs on their events" on public.rsvps
  for update to authenticated
  using (public.is_event_host(event_id)) with check (public.is_event_host(event_id));
drop policy "Guests and hosts remove RSVPs" on public.rsvps;
create policy "Hosts remove RSVPs on their events" on public.rsvps
  for delete to authenticated
  using (public.is_event_host(event_id));

-- ─── Access: signed-in users only ────────────────────────────────────────
revoke execute on function public.set_rsvp(uuid, public.rsvp_status) from public, anon;
revoke execute on function public.save_rsvp_answers(uuid, jsonb) from public, anon;
revoke execute on function public.get_event_social(uuid) from public, anon;
revoke execute on function public.get_home_feed(integer) from public, anon;
revoke execute on function public.get_my_invites() from public, anon;
revoke execute on function public.get_my_going() from public, anon;
grant execute on function public.set_rsvp(uuid, public.rsvp_status) to authenticated;
grant execute on function public.save_rsvp_answers(uuid, jsonb) to authenticated;
grant execute on function public.get_event_social(uuid) to authenticated;
grant execute on function public.get_home_feed(integer) to authenticated;
grant execute on function public.get_my_invites() to authenticated;
grant execute on function public.get_my_going() to authenticated;
