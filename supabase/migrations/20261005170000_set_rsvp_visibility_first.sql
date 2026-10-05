-- Check visibility before anything else in set_rsvp, so someone who can't see a
-- (private) event gets "Event not found" — not a hint that it exists and has
-- a questionnaire.
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
  if not public.can_view_event(p_event_id) then
    raise exception 'Event not found';
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
