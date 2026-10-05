-- DEV ONLY — fake accounts + events for testing Home, RSVPs, invites and the feed.
-- Run:   npm run db:seed-dev     (the CLI is linked to evident-dev only)
-- Undo:  npm run db:unseed-dev
-- Never run against prod.
--
-- All fake logins: <username>@example.com / TestPass123!
-- example.com is reserved for testing, so no real email is ever sent.

do $$
declare
  me uuid := (select id from auth.users where email = 'serjanling03@gmail.com');
  pw text := extensions.crypt('TestPass123!', extensions.gen_salt('bf'));

  sundown uuid := 'f0000000-0000-4000-8000-000000000001';
  kopi    uuid := 'f0000000-0000-4000-8000-000000000002';
  hall    uuid := 'f0000000-0000-4000-8000-000000000003';
  rachel  uuid := 'f0000000-0000-4000-8000-000000000004';
  dev     uuid := 'f0000000-0000-4000-8000-000000000005';
  mei     uuid := 'f0000000-0000-4000-8000-000000000006';
  arjun   uuid := 'f0000000-0000-4000-8000-000000000007';

  e_5k      uuid := 'fe000000-0000-4000-8000-000000000001';
  e_kallang uuid := 'fe000000-0000-4000-8000-000000000002';
  e_kopi    uuid := 'fe000000-0000-4000-8000-000000000003';
  e_concert uuid := 'fe000000-0000-4000-8000-000000000004';
  e_supper  uuid := 'fe000000-0000-4000-8000-000000000005';
  e_hike    uuid := 'fe000000-0000-4000-8000-000000000006';
  e_draft   uuid := 'fe000000-0000-4000-8000-000000000007';
  e_past    uuid := 'fe000000-0000-4000-8000-000000000008';

  q uuid;
  my_event uuid;
  f record;
begin
  -- Start clean: deleting the fake auth users cascades to everything they made.
  delete from auth.users where id::text like 'f0000000-0000-4000-8000-%';

  -- ── Accounts (trigger creates public.users rows) ──────────────────────
  for f in
    select * from (values
      (sundown, 'sundownrunners', 'Sundown Runners',        'org',        'We run 5k and eat 10k. Everyone finishes last at least once.'),
      (kopi,    'kopiclub',       'Tiong Bahru Kopi Club',  'org',        'Kopi, cards and long afternoons. Free, always.'),
      (hall,    'hallensemble',   'NUS Hall Ensemble',      'org',        'Strings, brass and a lot of instant noodles.'),
      (rachel,  'racheltan',      'Rachel Tan',             'individual', 'Sunrise runs and supper runs, in that order.'),
      (dev,     'devkumar',       'Dev Kumar',              'individual', 'Will organise anything involving kopi.'),
      (mei,     'meiling',        'Mei Ling',               'individual', 'Track nights, night markets, one badly-organised picnic a month.'),
      (arjun,   'arjunrao',       'Arjun Rao',              'individual', 'Board games and 10ks. Mostly board games.')
    ) as t(id, username, name, account_type, bio)
  loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      f.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      f.username || '@example.com', pw, now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('name', f.name),
      now() - interval '30 days', now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), f.id, f.id::text, 'email',
      jsonb_build_object('sub', f.id::text, 'email', f.username || '@example.com', 'email_verified', true),
      now(), now(), now()
    );
    update public.users
      set username = f.username, bio = f.bio, city = 'Singapore',
          account_type = f.account_type::public.account_type, onboarded_at = now() - interval '30 days'
      where id = f.id;
  end loop;

  -- ── Events ─────────────────────────────────────────────────────────────
  insert into public.events (id, host_id, title, description, date_time, ends_at, location, map_link,
                             cover_image, capacity, visibility, status, created_at) values
    (e_5k, sundown, 'Golden hour 5k + laksa',
     'Bring a water bottle. We start easy and regroup at the 2k mark, so come even if you haven''t run in months. Laksa after is optional but strongly encouraged.',
     date_trunc('day', now()) + interval '2 days 18 hours 45 minutes', date_trunc('day', now()) + interval '2 days 21 hours 30 minutes',
     'East Coast Park Carpark C4', null, 'https://picsum.photos/seed/evident-5k/1200/800', null, 'public', 'published', now() - interval '3 hours'),
    (e_kallang, sundown, 'Kallang night loop', 'Small group, steady pace. Capped so nobody gets left behind.',
     date_trunc('day', now()) + interval '5 days 20 hours', null,
     'Sports Hub', null, 'https://picsum.photos/seed/evident-kallang/1200/900', 2, 'public', 'published', now() - interval '1 day'),
    (e_kopi, kopi, 'Kopi + cards night', 'Kopi, cards and nothing else planned. Bring a deck if you have one.',
     date_trunc('day', now()) + interval '6 days 16 hours', null,
     'Tiong Bahru', null, 'https://picsum.photos/seed/evident-kopi/1000/1000', null, 'private', 'published', now() - interval '1 hour'),
    (e_concert, hall, 'Hall concert: autumn set', 'An hour of strings and brass, then snacks. Free entry.',
     date_trunc('day', now()) + interval '10 days 19 hours 30 minutes', date_trunc('day', now()) + interval '10 days 21 hours',
     'UCC Theatre', null, 'https://picsum.photos/seed/evident-concert/1600/900', 120, 'public', 'published', now() - interval '2 days'),
    (e_supper, rachel, 'Supper run + prata', 'Easy 5k to Jalan Kayu, prata at the end. Midnight-ish.',
     date_trunc('day', now()) + interval '3 days 23 hours', null,
     'Jalan Kayu', null, 'https://picsum.photos/seed/evident-supper/1200/800', null, 'private', 'published', now() - interval '5 hours'),
    (e_hike, dev, 'Southern Ridges hike', 'Kent Ridge to HortPark. Wear proper shoes.',
     date_trunc('day', now()) + interval '8 days 7 hours 30 minutes', null,
     'Kent Ridge Park', null, 'https://picsum.photos/seed/evident-hike/900/1200', null, 'public', 'published', now() - interval '6 hours'),
    (e_draft, arjun, 'Board games at mine', null, null, null, null, null, null, null, 'public', 'draft', now() - interval '1 day'),
    (e_past, mei, 'Bishan track night', '400m repeats, then bubble tea.',
     date_trunc('day', now()) - interval '7 days' + interval '19 hours', null,
     'Bishan Stadium', null, 'https://picsum.photos/seed/evident-track/1200/800', null, 'public', 'published', now() - interval '9 days');

  -- Questionnaires
  insert into public.event_questions (event_id, position, text, type) values (e_5k, 0, 'Staying for laksa?', 'mc') returning id into q;
  insert into public.event_question_options (question_id, position, label) values (q, 0, 'Yes'), (q, 1, 'No'), (q, 2, 'Maybe');
  insert into public.event_questions (event_id, position, text, type) values (e_5k, 1, 'What''s your usual 5k pace?', 'short');

  insert into public.event_questions (event_id, position, text, type) values (e_kopi, 0, 'Dietary restrictions', 'check') returning id into q;
  insert into public.event_question_options (question_id, position, label)
    values (q, 0, 'Vegetarian'), (q, 1, 'Halal'), (q, 2, 'Allergies'), (q, 3, 'Nil');

  -- ── Follows (fakes among themselves) ──────────────────────────────────
  insert into public.follows (follower_id, target_id, created_at) values
    (rachel, sundown, now() - interval '20 days'),
    (arjun, sundown, now() - interval '2 days'),
    (dev, kopi, now() - interval '10 days'),
    (mei, hall, now() - interval '1 day'),
    (rachel, dev, now() - interval '4 hours');

  -- ── RSVPs ──────────────────────────────────────────────────────────────
  insert into public.rsvps (event_id, user_id, status, waitlist_position, created_at, updated_at) values
    (e_5k, rachel, 'yes', null, now() - interval '12 minutes', now() - interval '12 minutes'),
    (e_5k, dev,    'yes', null, now() - interval '2 hours',    now() - interval '2 hours'),
    (e_5k, arjun,  'yes', null, now() - interval '1 day',      now() - interval '1 day'),
    (e_5k, mei,    'maybe', null, now() - interval '3 hours',  now() - interval '3 hours'),
    -- Kallang: capacity 2 → full, Mei waitlisted
    (e_kallang, rachel, 'yes', null, now() - interval '20 hours', now() - interval '20 hours'),
    (e_kallang, arjun,  'yes', null, now() - interval '19 hours', now() - interval '19 hours'),
    (e_kallang, mei,    'yes', 1,    now() - interval '5 hours',  now() - interval '5 hours'),
    (e_kopi, dev, 'yes', null, now() - interval '50 minutes', now() - interval '50 minutes'),
    (e_concert, mei, 'yes', null, now() - interval '1 day', now() - interval '1 day'),
    (e_supper, dev, 'yes', null, now() - interval '4 hours', now() - interval '4 hours'),
    (e_supper, mei, 'yes', null, now() - interval '3 hours', now() - interval '3 hours'),
    (e_hike, rachel, 'yes', null, now() - interval '5 hours', now() - interval '5 hours');
  insert into public.event_invites (event_id, invitee_id, invited_by) values
    (e_kopi, dev, kopi), (e_supper, dev, rachel), (e_supper, mei, rachel);

  -- ── Involving the real account (skipped if it doesn't exist) ──────────
  if me is not null then
    insert into public.follows (follower_id, target_id, created_at) values
      (me, sundown, now() - interval '7 days'),
      (me, kopi, now() - interval '7 days'),
      (me, rachel, now() - interval '6 days'),
      (me, dev, now() - interval '6 days'),
      (me, mei, now() - interval '5 days'),
      (rachel, me, now() - interval '6 days'),
      (dev, me, now() - interval '5 days')
    on conflict do nothing;

    -- Invites waiting on Home → Invites
    insert into public.event_invites (event_id, invitee_id, invited_by) values
      (e_kopi, me, kopi),
      (e_supper, me, rachel),
      (e_concert, me, hall)
    on conflict do nothing;

    -- Fake guests on the real account's newest published event
    select id into my_event from public.events
      where host_id = me and status = 'published' order by created_at desc limit 1;
    if my_event is not null then
      insert into public.rsvps (event_id, user_id, status, created_at, updated_at) values
        (my_event, rachel, 'yes',   now() - interval '1 hour',  now() - interval '1 hour'),
        (my_event, arjun,  'yes',   now() - interval '2 hours', now() - interval '2 hours'),
        (my_event, dev,    'maybe', now() - interval '3 hours', now() - interval '3 hours')
      on conflict do nothing;
      insert into public.event_invites (event_id, invitee_id, invited_by)
        values (my_event, mei, me), (my_event, rachel, me)
      on conflict do nothing;
    end if;
  end if;
end $$;

select json_build_object(
  'fake_accounts', (select count(*) from public.users where id::text like 'f0000000-0000-4000-8000-%'),
  'fake_events', (select count(*) from public.events where id::text like 'fe000000-0000-4000-8000-%'),
  'rsvps', (select count(*) from public.rsvps r where r.user_id::text like 'f0000000-0000-4000-8000-%'),
  'invites_to_you', (select count(*) from public.event_invites i join auth.users u on u.id = i.invitee_id where u.email = 'serjanling03@gmail.com')
) as result;
