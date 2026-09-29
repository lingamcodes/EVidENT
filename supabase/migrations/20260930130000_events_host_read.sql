-- Hosts read their own events directly from the row. can_view_event() looks the
-- event up in a separate query, which can't see a row inserted in the same
-- statement, so INSERT … RETURNING (used by save_event) was rejected.
drop policy "Events are readable when viewable" on public.events;

create policy "Events are readable when viewable" on public.events
  for select to authenticated
  using (host_id = (select auth.uid()) or public.can_view_event(id));
