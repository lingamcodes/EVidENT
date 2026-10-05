-- DEV ONLY — removes every fake account from seed.sql and everything they made
-- (events, questions, RSVPs, invites, follows) via ON DELETE CASCADE.
-- Real accounts and their own events stay; fake RSVPs/invites on them go.
-- Run: npm run db:unseed-dev

delete from auth.users where id::text like 'f0000000-0000-4000-8000-%';

select json_build_object(
  'fake_accounts_left', (select count(*) from public.users where id::text like 'f0000000-0000-4000-8000-%'),
  'fake_events_left', (select count(*) from public.events where id::text like 'fe000000-0000-4000-8000-%')
) as result;
