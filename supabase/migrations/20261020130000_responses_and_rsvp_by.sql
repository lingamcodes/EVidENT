-- Host responses (summary / by guest / flags / export) and RSVP-by on invite cards.
--  - event_questions.important: host marks a question (allergies, medical…);
--    guests with a real answer to it get flagged on the Responses screen.
--  - save_event saves the flag.
--  - get_my_invites returns rsvp_by for the "RSVP by … / closes in …" banner.
-- Hosts already read their guests' answers through RLS (rsvp_answers policies).

alter table public.event_questions add column important boolean not null default false;

create or replace function public.save_event(p_event jsonb, p_questions jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid := nullif(p_event ->> 'id', '')::uuid;
  question jsonb;
  v_question_id uuid;
  opt jsonb;
  v_option_id uuid;
  kept_questions uuid[] := '{}';
  kept_options uuid[];
  q_pos integer := 0;
  o_pos integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to save events';
  end if;

  if v_event_id is null then
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
    returning id into v_event_id;
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
    where id = v_event_id and host_id = (select auth.uid());
    if not found then
      raise exception 'Event not found, or you are not its host';
    end if;
  end if;

  for question in select * from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
    v_question_id := null;
    if coalesce(question ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
      update public.event_questions set
        position = q_pos,
        text = question ->> 'text',
        type = (question ->> 'type')::public.question_type,
        image_url = nullif(question ->> 'image_url', ''),
        important = coalesce((question ->> 'important')::boolean, false)
      where id = (question ->> 'id')::uuid and event_questions.event_id = v_event_id
      returning id into v_question_id;
    end if;
    if v_question_id is null then
      insert into public.event_questions (event_id, position, text, type, image_url, important)
      values (
        v_event_id, q_pos, question ->> 'text',
        (question ->> 'type')::public.question_type, nullif(question ->> 'image_url', ''),
        coalesce((question ->> 'important')::boolean, false)
      )
      returning id into v_question_id;
    end if;
    kept_questions := kept_questions || v_question_id;

    kept_options := '{}';
    o_pos := 0;
    for opt in select * from jsonb_array_elements(coalesce(question -> 'options', '[]'::jsonb)) loop
      v_option_id := null;
      if coalesce(opt ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
        update public.event_question_options set position = o_pos, label = opt ->> 'label'
        where id = (opt ->> 'id')::uuid and event_question_options.question_id = v_question_id
        returning id into v_option_id;
      end if;
      if v_option_id is null then
        insert into public.event_question_options (question_id, position, label)
        values (v_question_id, o_pos, opt ->> 'label')
        returning id into v_option_id;
      end if;
      kept_options := kept_options || v_option_id;
      o_pos := o_pos + 1;
    end loop;
    delete from public.event_question_options
      where event_question_options.question_id = v_question_id
        and not (id = any (kept_options));

    q_pos := q_pos + 1;
  end loop;

  delete from public.event_questions
    where event_questions.event_id = v_event_id and not (id = any (kept_questions));

  return v_event_id;
end;
$$;

create or replace function public.get_my_invites()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x.date_time nulls last), '[]'::json)
  from (
    select e.id as event_id, e.title, e.date_time, e.location, e.cover_image, e.rsvp_by,
           u.name as inviter_name, u.avatar_url as inviter_avatar_url,
           h.name as host_name, h.username as host_username,
           i.created_at as invited_at,
           (select count(*) from public.rsvps r
            join public.follows f on f.target_id = r.user_id and f.follower_id = (select auth.uid())
            where r.event_id = e.id and r.status = 'yes' and r.waitlist_position is null) as friends_going,
           coalesce((
             select json_agg(json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url))
             from (
               select fu.id, fu.name, fu.avatar_url
               from public.rsvps r
               join public.follows f on f.target_id = r.user_id and f.follower_id = (select auth.uid())
               join public.users fu on fu.id = r.user_id
               where r.event_id = e.id and r.status = 'yes' and r.waitlist_position is null
               order by r.updated_at desc
               limit 3
             ) p), '[]'::json) as friends_going_people,
           exists (select 1 from public.event_questions q where q.event_id = e.id) as has_questions,
           (select r.status from public.rsvps r where r.event_id = e.id and r.user_id = (select auth.uid())) as my_status
    from public.event_invites i
    join public.events e on e.id = i.event_id
    join public.users u on u.id = i.invited_by
    join public.users h on h.id = e.host_id
    where i.invitee_id = (select auth.uid())
      and e.status = 'published'
      and e.host_id <> (select auth.uid())
      and (coalesce(e.ends_at, e.date_time) is null or coalesce(e.ends_at, e.date_time) > now())
  ) x;
$$;
