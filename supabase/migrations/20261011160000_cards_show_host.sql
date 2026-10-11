-- Event cards show "By @host" under the photo, so an invite from a guest never
-- looks like it's their event. Both Home functions now return the host's name
-- and username (public columns).

create or replace function public.get_my_invites()
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

create or replace function public.get_my_going()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(json_agg(x order by x.date_time nulls last), '[]'::json)
  from (
    select e.id as event_id, e.title, e.date_time, e.ends_at, e.location, e.cover_image,
           h.name as host_name, h.username as host_username,
           r.waitlist_position is not null as waitlisted,
           (select count(*) from public.rsvps g
            where g.event_id = e.id and g.status = 'yes' and g.waitlist_position is null) as going_count,
           (select count(*) from public.rsvps g
            join public.follows f on f.target_id = g.user_id and f.follower_id = (select auth.uid())
            where g.event_id = e.id and g.status = 'yes' and g.waitlist_position is null) as friends_going,
           coalesce((
             select json_agg(json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url))
             from (
               select fu.id, fu.name, fu.avatar_url
               from public.rsvps g
               join public.follows f on f.target_id = g.user_id and f.follower_id = (select auth.uid())
               join public.users fu on fu.id = g.user_id
               where g.event_id = e.id and g.status = 'yes' and g.waitlist_position is null
               order by g.updated_at desc
               limit 3
             ) p), '[]'::json) as friends_going_people
    from public.rsvps r
    join public.events e on e.id = r.event_id
    join public.users h on h.id = e.host_id
    where r.user_id = (select auth.uid())
      and r.status = 'yes'
      and e.status = 'published'
      and (coalesce(e.ends_at, e.date_time) is null or coalesce(e.ends_at, e.date_time) > now())
  ) x;
$$;
