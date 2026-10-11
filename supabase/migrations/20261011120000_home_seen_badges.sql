-- Home's Friends / Invites red badges count items the user hasn't seen yet.
-- "Seen" is stored on the account (same on every device).

alter table public.users
  add column last_seen_friends_at timestamptz,
  add column last_seen_invites_at timestamptz;

-- Owner can update them (they're private: not in the public read grant, and the
-- owner reads them via get_my_profile()).
grant update (last_seen_friends_at, last_seen_invites_at) on public.users to authenticated;

-- Invites now also return when you were invited, to count unseen ones.
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
           i.created_at as invited_at,
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
