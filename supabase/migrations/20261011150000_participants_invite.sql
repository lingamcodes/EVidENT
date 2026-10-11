-- Who may invite people to an event (event_invites insert policy):
--  - the host, always
--  - PUBLIC published events: anyone confirmed going (not waitlisted)
--  - PRIVATE published events with allow_guest_invites: guests who were invited
--    or have RSVPed (unchanged)

create or replace function public.can_invite_to_event(target_event_id uuid)
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
          and e.visibility = 'public'
          and exists (
            select 1 from public.rsvps r
            where r.event_id = e.id and r.user_id = (select auth.uid())
              and r.status = 'yes' and r.waitlist_position is null
          )
        )
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
