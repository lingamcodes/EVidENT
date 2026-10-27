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
  -- Extra events that only exist to invite the real account
  e_pottery uuid := 'fe000000-0000-4000-8000-000000000009';
  e_hawker  uuid := 'fe000000-0000-4000-8000-00000000000a';
  e_cleanup uuid := 'fe000000-0000-4000-8000-00000000000b';
  e_quiz    uuid := 'fe000000-0000-4000-8000-00000000000c';

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
     'East Coast Park Carpark C4', null, 'https://picsum.photos/seed/evident-5k/1000/1000', null, 'public', 'published', now() - interval '3 hours'),
    (e_kallang, sundown, 'Kallang night loop', 'Small group, steady pace. Capped so nobody gets left behind.',
     date_trunc('day', now()) + interval '5 days 20 hours', null,
     'Sports Hub', null, 'https://picsum.photos/seed/evident-kallang/1000/1000', 2, 'public', 'published', now() - interval '1 day'),
    (e_kopi, kopi, 'Kopi + cards night', 'Kopi, cards and nothing else planned. Bring a deck if you have one.',
     date_trunc('day', now()) + interval '6 days 16 hours', null,
     'Tiong Bahru', null, 'https://picsum.photos/seed/evident-kopi/1000/1000', null, 'private', 'published', now() - interval '1 hour'),
    (e_concert, hall, 'Hall concert: autumn set', 'An hour of strings and brass, then snacks. Free entry.',
     date_trunc('day', now()) + interval '10 days 19 hours 30 minutes', date_trunc('day', now()) + interval '10 days 21 hours',
     'UCC Theatre', null, 'https://picsum.photos/seed/evident-concert/1000/1000', 120, 'public', 'published', now() - interval '2 days'),
    (e_supper, rachel, 'Supper run + prata', 'Easy 5k to Jalan Kayu, prata at the end. Midnight-ish.',
     date_trunc('day', now()) + interval '3 days 23 hours', null,
     'Jalan Kayu', null, 'https://picsum.photos/seed/evident-supper/1000/1000', null, 'private', 'published', now() - interval '5 hours'),
    (e_hike, dev, 'Southern Ridges hike', 'Kent Ridge to HortPark. Wear proper shoes.',
     date_trunc('day', now()) + interval '8 days 7 hours 30 minutes', null,
     'Kent Ridge Park', null, 'https://picsum.photos/seed/evident-hike/1000/1000', null, 'public', 'published', now() - interval '6 hours'),
    (e_draft, arjun, 'Board games at mine', null, null, null, null, null, null, null, 'public', 'draft', now() - interval '1 day'),
    (e_past, mei, 'Bishan track night', '400m repeats, then bubble tea.',
     date_trunc('day', now()) - interval '7 days' + interval '19 hours', null,
     'Bishan Stadium', null, 'https://picsum.photos/seed/evident-track/1000/1000', null, 'public', 'published', now() - interval '9 days');

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

  -- Guests going to events with questionnaires have answered them (required to RSVP).
  insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
  select r.id, qq.id, o.id, null
  from public.rsvps r
  join public.event_questions qq on qq.event_id = r.event_id and qq.type = 'mc'
  join public.event_question_options o on o.question_id = qq.id and o.label = 'Yes'
  where r.event_id = e_5k and r.status = 'yes';
  insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
  select r.id, qq.id, null, '6:30/km, getting faster'
  from public.rsvps r
  join public.event_questions qq on qq.event_id = r.event_id and qq.type = 'short'
  where r.event_id = e_5k and r.status = 'yes';
  insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
  select r.id, qq.id, o.id, null
  from public.rsvps r
  join public.event_questions qq on qq.event_id = r.event_id
  join public.event_question_options o on o.question_id = qq.id and o.label = 'Nil'
  where r.event_id = e_kopi and r.status = 'yes';

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

    -- RSVP deadlines for the invite-card banner: the concert closes in ~20 hours
    -- (urgent), the 5k in ~1.5 days.
    update public.events set rsvp_by = now() + interval '20 hours' where id = e_concert;
    update public.events set rsvp_by = now() + interval '36 hours' where id = e_5k;

    -- Invites waiting on Home → Invites
    insert into public.event_invites (event_id, invitee_id, invited_by) values
      (e_kopi, me, kopi),
      (e_supper, me, rachel),
      (e_concert, me, hall),
      -- Invited by a guest, not the host: Rachel is going to Sundown's 5k
      (e_5k, me, rachel),
      -- Dev's hike, passed on by Rachel (a guest who's going)
      (e_hike, me, rachel),
      -- Kallang is full: accepting puts you on the waitlist
      (e_kallang, me, arjun)
    on conflict do nothing;

    -- More invites, each showing something different on the invite card
    insert into public.events (id, host_id, title, description, date_time, ends_at, rsvp_by, location,
                               cover_image, capacity, visibility, status, created_at) values
      -- private, RSVP closes in 3 days, no friends going
      (e_pottery, mei, 'Pottery taster', 'Two hours on the wheel. Clay and aprons provided; you keep one piece.',
       date_trunc('day', now()) + interval '7 days 14 hours', date_trunc('day', now()) + interval '7 days 16 hours',
       now() + interval '3 days', 'Tiong Bahru Clay Studio',
       'https://picsum.photos/seed/evident-pottery/1000/1000', 8, 'private', 'published', now() - interval '30 minutes'),
      -- public, several friends going, invited by a guest
      (e_hawker, rachel, 'Hawker crawl: Old Airport Road', 'Six stalls, one stomach. Bring cash and an appetite.',
       date_trunc('day', now()) + interval '4 days 18 hours', null, null, 'Old Airport Road Food Centre',
       'https://picsum.photos/seed/evident-hawker/1000/1000', null, 'public', 'published', now() - interval '2 hours'),
      -- org event with a questionnaire, RSVP closes in ~10 hours (red banner)
      (e_cleanup, sundown, 'Beach cleanup + breakfast', 'We bring bags and grabbers. Breakfast on us after.',
       date_trunc('day', now()) + interval '3 days 7 hours', date_trunc('day', now()) + interval '3 days 10 hours',
       now() + interval '10 hours', 'East Coast Park Area D',
       'https://picsum.photos/seed/evident-cleanup/1000/1000', 30, 'public', 'published', now() - interval '45 minutes'),
      -- RSVP-by already passed (card shows "RSVPs have closed")
      (e_quiz, hall, 'Hall quiz night', 'Teams of four. Prizes for first place and best team name.',
       date_trunc('day', now()) + interval '2 days 20 hours', null,
       now() - interval '2 hours', 'Hall common lounge',
       'https://picsum.photos/seed/evident-quiz/1000/1000', null, 'public', 'published', now() - interval '3 days');

    insert into public.event_questions (event_id, position, text, type, important)
      values (e_cleanup, 0, 'Any allergies or medical conditions we should know about?', 'short', true);
    insert into public.event_questions (event_id, position, text, type) values (e_cleanup, 1, 'Staying for breakfast?', 'mc') returning id into q;
    insert into public.event_question_options (question_id, position, label) values (q, 0, 'Yes'), (q, 1, 'No');

    insert into public.rsvps (event_id, user_id, status, created_at, updated_at) values
      (e_hawker, dev, 'yes', now() - interval '90 minutes', now() - interval '90 minutes'),
      (e_hawker, mei, 'yes', now() - interval '80 minutes', now() - interval '80 minutes'),
      (e_hawker, arjun, 'yes', now() - interval '70 minutes', now() - interval '70 minutes'),
      (e_quiz, mei, 'yes', now() - interval '2 days', now() - interval '2 days');

    insert into public.event_invites (event_id, invitee_id, invited_by, created_at) values
      (e_pottery, me, mei, now() - interval '25 minutes'),
      (e_hawker, me, dev, now() - interval '60 minutes'),
      (e_cleanup, me, sundown, now() - interval '40 minutes'),
      (e_quiz, me, hall, now() - interval '3 days')
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

      -- Their questionnaire answers, so the host's Responses screen has data:
      -- Rachel picks an allergy option if there is one (detail "Peanuts"), else the
      -- first option; Arjun picks the last option. Diet/allergy questions are marked
      -- important so the "Needs attention" flag shows.
      update public.event_questions set important = true
        where event_id = my_event and text ~* 'diet|allerg';
      insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
      select r.id, q.id, o.id, case when o.label ~* 'allerg' then 'Peanuts' end
      from public.rsvps r
      join public.event_questions q on q.event_id = r.event_id and q.type in ('mc', 'check')
      join lateral (
        select oo.id, oo.label from public.event_question_options oo
        where oo.question_id = q.id
        order by case when r.user_id = rachel then (oo.label ~* 'allerg')::int else 0 end desc,
                 case when r.user_id = rachel then oo.position else -oo.position end
        limit 1
      ) o on true
      where r.event_id = my_event and r.status = 'yes';
      insert into public.rsvp_answers (rsvp_id, question_id, option_id, text_answer)
      select r.id, q.id, null, case when r.user_id = rachel then 'Can bring a speaker' else 'Nil' end
      from public.rsvps r
      join public.event_questions q on q.event_id = r.event_id and q.type = 'short'
      where r.event_id = my_event and r.status = 'yes';
    end if;
  end if;
end $$;

select json_build_object(
  'fake_accounts', (select count(*) from public.users where id::text like 'f0000000-0000-4000-8000-%'),
  'fake_events', (select count(*) from public.events where id::text like 'fe000000-0000-4000-8000-%'),
  'rsvps', (select count(*) from public.rsvps r where r.user_id::text like 'f0000000-0000-4000-8000-%'),
  'invites_to_you', (select count(*) from public.event_invites i join auth.users u on u.id = i.invitee_id where u.email = 'serjanling03@gmail.com')
) as result;
