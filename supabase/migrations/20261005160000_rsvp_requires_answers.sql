-- "Accept" is provisional when an event has a questionnaire: you only become
-- going (or waitlisted) once your answers are submitted. Enforced here:
--   * set_rsvp refuses 'yes' for events with questions (unless already going)
--   * rsvp_with_answers checks every question is answered, then RSVPs yes and
--     stores the answers in one transaction
-- The shared RSVP rules (deadline, capacity, waitlist, promotion) move into
-- private.apply_rsvp, in a schema the API doesn't expose.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.apply_rsvp(p_uid uuid, p_event_id uuid, p_status public.rsvp_status)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := p_uid;
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
revoke execute on function private.apply_rsvp(uuid, uuid, public.rsvp_status) from public, anon, authenticated;

create or replace function public.set_rsvp(p_event_id uuid, p_status public.rsvp_status)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to RSVP';
  end if;
  if p_status = 'yes'
     and exists (select 1 from public.event_questions where event_id = p_event_id)
     and not exists (
       select 1 from public.rsvps
       where event_id = p_event_id and user_id = (select auth.uid()) and status = 'yes'
     ) then
    raise exception 'Answer the host''s questions to RSVP';
  end if;
  return private.apply_rsvp((select auth.uid()), p_event_id, p_status);
end;
$$;

-- p_answers: [{ question_id, option_id?, text_answer? }, …]
create function public.rsvp_with_answers(p_event_id uuid, p_answers jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result json;
  v_rsvp uuid;
  v_answer jsonb;
  v_question record;
  v_picked integer;
begin
  if v_uid is null then
    raise exception 'Sign in to RSVP';
  end if;
  if not public.can_view_event(p_event_id) then
    raise exception 'Event not found';
  end if;

  -- Every answer must belong to this event's questions / options.
  for v_answer in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    if not exists (
      select 1 from public.event_questions
      where id = (v_answer ->> 'question_id')::uuid and event_id = p_event_id
    ) then
      raise exception 'That question is not part of this event';
    end if;
    if nullif(v_answer ->> 'option_id', '') is not null and not exists (
      select 1 from public.event_question_options
      where id = (v_answer ->> 'option_id')::uuid and question_id = (v_answer ->> 'question_id')::uuid
    ) then
      raise exception 'That option is not part of this question';
    end if;
  end loop;

  -- Every question answered: short text non-empty, multiple choice exactly one,
  -- checkbox at least one.
  for v_question in select id, type from public.event_questions where event_id = p_event_id loop
    if v_question.type = 'short' then
      if not exists (
        select 1 from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
        where (a ->> 'question_id')::uuid = v_question.id and nullif(trim(a ->> 'text_answer'), '') is not null
      ) then
        raise exception 'Answer every question to RSVP';
      end if;
    else
      select count(*) into v_picked
        from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
        where (a ->> 'question_id')::uuid = v_question.id and nullif(a ->> 'option_id', '') is not null;
      if v_picked = 0 or (v_question.type = 'mc' and v_picked > 1) then
        raise exception 'Answer every question to RSVP';
      end if;
    end if;
  end loop;

  v_result := private.apply_rsvp(v_uid, p_event_id, 'yes');

  select id into v_rsvp from public.rsvps where event_id = p_event_id and user_id = v_uid;
  delete from public.rsvp_answers where rsvp_id = v_rsvp;
  insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
  select v_rsvp,
         (a ->> 'question_id')::uuid,
         nullif(a ->> 'option_id', '')::uuid,
         nullif(trim(a ->> 'text_answer'), '')
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a;

  return v_result;
end;
$$;

revoke execute on function public.rsvp_with_answers(uuid, jsonb) from public, anon;
grant execute on function public.rsvp_with_answers(uuid, jsonb) to authenticated;
