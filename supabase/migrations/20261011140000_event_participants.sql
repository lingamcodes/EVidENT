-- Participants see everyone who's going. Anyone confirmed going (not waitlisted)
-- and the host get the full list; everyone else gets [] and keeps seeing only
-- the summary from get_event_social (people they follow + a count).

create function public.get_event_participants(p_event_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url)
                           order by r.created_at), '[]'::json)
  from public.rsvps r
  join public.users u on u.id = r.user_id
  where r.event_id = p_event_id
    and r.status = 'yes'
    and r.waitlist_position is null
    and (
      public.is_event_host(p_event_id)
      or exists (
        select 1 from public.rsvps me
        where me.event_id = p_event_id
          and me.user_id = (select auth.uid())
          and me.status = 'yes'
          and me.waitlist_position is null
      )
    );
$$;

revoke execute on function public.get_event_participants(uuid) from public, anon;
grant execute on function public.get_event_participants(uuid) to authenticated;
