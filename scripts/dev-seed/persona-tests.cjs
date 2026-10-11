// End-to-end tests as the seeded fake people, through the real Supabase API
// (sign-in -> tables / RPCs / Storage) - the same path the app uses. DEV ONLY.
//
// Run:  npm run test:dev   (resets the fake data before and after, even on failure)
// Reads EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY from .env.local and refuses to run
// unless that URL is the project the CLI is linked to (evident-dev).
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const reseed = () => execSync('npm run db:seed-dev', { stdio: 'ignore' });

const URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const linkedRef = fs.readFileSync(path.join(__dirname, '../../supabase/.temp/project-ref'), 'utf8').trim();
if (!URL || !KEY || !URL.includes(linkedRef)) {
  console.error(`Refusing to run: .env.local URL (${URL || 'missing'}) is not the linked dev project (${linkedRef}).`);
  process.exit(1);
}
const PW = 'TestPass123!';
const ID = {
  sundown: 'f0000000-0000-4000-8000-000000000001', kopi: 'f0000000-0000-4000-8000-000000000002',
  hall: 'f0000000-0000-4000-8000-000000000003', rachel: 'f0000000-0000-4000-8000-000000000004',
  dev: 'f0000000-0000-4000-8000-000000000005', mei: 'f0000000-0000-4000-8000-000000000006',
  arjun: 'f0000000-0000-4000-8000-000000000007',
};
const EV = {
  fiveK: 'fe000000-0000-4000-8000-000000000001', kallang: 'fe000000-0000-4000-8000-000000000002',
  kopi: 'fe000000-0000-4000-8000-000000000003', concert: 'fe000000-0000-4000-8000-000000000004',
  supper: 'fe000000-0000-4000-8000-000000000005', hike: 'fe000000-0000-4000-8000-000000000006',
  draft: 'fe000000-0000-4000-8000-000000000007', past: 'fe000000-0000-4000-8000-000000000008',
};

const results = [];
let section = '';
const check = (name, ok, detail = '') => results.push({ section, name, ok: !!ok, detail });
const errMsg = (e) => (e ? e.message || String(e) : '');

async function as(username) {
  const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: `${username}@example.com`, password: PW });
  if (error) throw new Error(`login ${username}: ${error.message}`);
  return c;
}

// Minimal valid 1×1 JPEG for storage tests.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==',
  'base64',
);

(async () => {
  console.log('Resetting fake data…');
  reseed();

  // ── Sign-in ──────────────────────────────────────────────────────────
  section = 'Sign-in';
  const P = {};
  for (const u of ['sundownrunners', 'kopiclub', 'hallensemble', 'racheltan', 'devkumar', 'meiling', 'arjunrao']) {
    try { P[u] = await as(u); check(`${u} can log in`, true); } catch (e) { check(`${u} can log in`, false, errMsg(e)); }
  }
  const anon = createClient(URL, KEY, { auth: { persistSession: false } });
  const { rachel, dev, mei, arjun } = { rachel: P.racheltan, dev: P.devkumar, mei: P.meiling, arjun: P.arjunrao };
  const sundown = P.sundownrunners, kopi = P.kopiclub;

  // ── Privacy ──────────────────────────────────────────────────────────
  section = 'Privacy';
  {
    const { data, error } = await rachel.from('users').select('id, email').eq('id', ID.dev);
    check("Rachel can't read Dev's email", !!error || !(data?.[0]?.email), error ? 'blocked: ' + errMsg(error) : JSON.stringify(data));
    const { data: pub } = await rachel.from('users').select('name, username, bio').eq('id', ID.dev).single();
    check("Rachel can read Dev's public profile", pub?.name === 'Dev Kumar');
    const { data: me } = await rachel.rpc('get_my_profile').single();
    check('Rachel sees her own email via get_my_profile', me?.email === 'racheltan@example.com');
    const { error: e1 } = await rachel.from('users').update({ email: 'x@example.com' }).eq('id', ID.rachel);
    check("Rachel can't change her email", !!e1, errMsg(e1));
    const { data: d2 } = await rachel.from('users').update({ bio: 'hijacked' }).eq('id', ID.dev).select();
    check("Rachel can't edit Dev's profile", !d2?.length);
    const { error: e3 } = await rachel.from('users').update({ bio: 'Updated by test' }).eq('id', ID.rachel);
    check('Rachel can edit her own bio', !e3, errMsg(e3));
    await rachel.from('users').update({ account_type: 'org' }).eq('id', ID.rachel);
    const { data: me2 } = await rachel.rpc('get_my_profile').single();
    check("Rachel can't switch to org after onboarding", me2?.account_type === 'individual', me2?.account_type);
    const { data: anonUsers } = await anon.from('users').select('id').limit(5);
    check('Signed-out visitors read no users', !anonUsers?.length);
    const { data: anonEvents } = await anon.from('events').select('id').limit(5);
    check('Signed-out visitors read no events', !anonEvents?.length);
    const { data: acct } = await anon.rpc('check_account', { lookup_email: 'racheltan@example.com' });
    check('Account checker reports existing email (known trade-off)', acct?.exists === true);
  }

  // ── Private events & invites ─────────────────────────────────────────
  section = 'Private events';
  {
    const { data: seen } = await arjun.from('events').select('id').eq('id', EV.supper);
    check("Arjun (not invited) can't see Rachel's private Supper run", !seen?.length);
    const { data: soc } = await arjun.rpc('get_event_social', { p_event_id: EV.supper });
    check('…and gets no social data for it', soc === null);
    const { error: r1 } = await arjun.rpc('set_rsvp', { p_event_id: EV.supper, p_status: 'yes' });
    check('…and can\'t RSVP ("Event not found")', /not found/i.test(errMsg(r1)), errMsg(r1));
    const { data: draft } = await rachel.from('events').select('id').eq('id', EV.draft);
    check("Rachel can't see Arjun's draft", !draft?.length);
    const { data: host } = await rachel.from('events').select('invite_code').eq('id', EV.supper).single();
    const { data: preview } = await anon.rpc('get_invite_preview', { code: host.invite_code });
    check('Invite preview works signed out (title, location)', preview?.title === 'Supper run + prata' && !!preview?.location);
    check('Invite preview has no guest data', preview && !('going' in preview) && !('guests' in preview));
    const { data: joined, error: jErr } = await arjun.rpc('join_event_by_code', { code: host.invite_code });
    check('Arjun joins with the invite code', joined === EV.supper, errMsg(jErr));
    const { data: seen2 } = await arjun.from('events').select('id').eq('id', EV.supper);
    check('…and can now see the event', seen2?.length === 1);
    const { data: r2, error: r2e } = await arjun.rpc('set_rsvp', { p_event_id: EV.supper, p_status: 'yes' });
    check('…and RSVP yes (no questionnaire)', r2?.status === 'yes', errMsg(r2e));
    const { error: inv } = await dev.from('event_invites').insert({ event_id: EV.kopi, invitee_id: ID.arjun, invited_by: ID.dev });
    check("Dev (guest) can't invite others when the host doesn't allow it", !!inv, errMsg(inv));
    const { error: hostInv } = await kopi.from('event_invites').insert({ event_id: EV.kopi, invitee_id: ID.mei, invited_by: ID.kopi });
    check('Kopi Club (host) can invite Mei', !hostInv, errMsg(hostInv));
    const { data: rg } = await rachel.from('rsvps').select('user_id, status').eq('event_id', EV.supper);
    check('Rachel (host) sees all RSVPs on her event', (rg?.length ?? 0) >= 3, `${rg?.length} rows`);
    const { data: other } = await arjun.from('rsvps').select('user_id').eq('event_id', EV.supper);
    check("Arjun (guest) sees only his own RSVP, not others'", other?.length === 1 && other[0].user_id === ID.arjun, `${other?.length} rows`);
  }

  // ── Questionnaire required to RSVP ───────────────────────────────────
  section = 'Questionnaire RSVP';
  {
    const { data: invites } = await mei.rpc('get_my_invites');
    const kopiInvite = invites?.find((i) => i.event_id === EV.kopi);
    check("Mei's Invites tab shows Kopi + cards night", !!kopiInvite && kopiInvite.has_questions === true && kopiInvite.my_status === null);
    const { error: e1 } = await mei.rpc('set_rsvp', { p_event_id: EV.kopi, p_status: 'yes' });
    check('Plain "yes" is refused (must answer)', /answer/i.test(errMsg(e1)), errMsg(e1));
    const { data: qs } = await mei.from('event_questions').select('id, type, event_question_options(id, label)').eq('event_id', EV.kopi);
    const q = qs?.[0];
    const { error: e2 } = await mei.rpc('rsvp_with_answers', { p_event_id: EV.kopi, p_answers: [] });
    check('Empty answers are refused', /answer every/i.test(errMsg(e2)), errMsg(e2));
    const allergies = q?.event_question_options.find((o) => o.label === 'Allergies');
    const { data: ok, error: e3 } = await mei.rpc('rsvp_with_answers', {
      p_event_id: EV.kopi,
      p_answers: [{ question_id: q.id, option_id: allergies.id, text_answer: 'Peanuts' }],
    });
    check('Complete answers → going', ok?.status === 'yes', errMsg(e3));
    const { data: going } = await mei.rpc('get_my_going');
    check('Kopi now under Mei\'s "You\'re going"', going?.some((g) => g.event_id === EV.kopi));
    const { data: ans } = await kopi.from('rsvp_answers').select('text_answer, rsvps!inner(user_id)').eq('rsvps.user_id', ID.mei);
    check('Host sees Mei\'s allergy detail', ans?.some((a) => a.text_answer === 'Peanuts'));
    const { data: rachelAns } = await rachel.from('rsvp_answers').select('id, rsvps!inner(event_id)').eq('rsvps.event_id', EV.kopi);
    check("Rachel (not involved) can't read Kopi answers", !rachelAns?.length);
  }

  // ── Capacity, waitlist, leaving ──────────────────────────────────────
  section = 'Waitlist';
  {
    const { data: d1 } = await dev.rpc('set_rsvp', { p_event_id: EV.kallang, p_status: 'yes' });
    check('Dev joins full Kallang → waitlist #2 (Mei is #1)', d1?.waitlisted === true && d1?.waitlist_rank === 2, JSON.stringify(d1));
    const { data: soc } = await mei.rpc('get_event_social', { p_event_id: EV.kallang });
    check('Mei sees herself as waitlist #1', soc?.my_status === 'yes' && soc?.my_waitlist_rank === 1, JSON.stringify(soc));
    const { data: left } = await rachel.rpc('set_rsvp', { p_event_id: EV.kallang, p_status: 'no' });
    check('Rachel leaves Kallang', left?.status === 'no');
    const { data: soc2 } = await mei.rpc('get_event_social', { p_event_id: EV.kallang });
    check('Mei is promoted to going', soc2?.my_status === 'yes' && soc2?.my_waitlist_rank === 0, JSON.stringify(soc2));
    const { data: soc3 } = await dev.rpc('get_event_social', { p_event_id: EV.kallang });
    check('Dev moves up to waitlist #1', soc3?.my_waitlist_rank === 1, JSON.stringify(soc3));
    const { data: meiList } = await mei.rpc('get_event_participants', { p_event_id: EV.kallang });
    check('Mei (going) sees all 2 participants, herself included', meiList?.length === 2 && meiList.some((p) => p.id === ID.mei), JSON.stringify(meiList));
    const { data: devList } = await dev.rpc('get_event_participants', { p_event_id: EV.kallang });
    check("Dev (waitlisted) can't see the participant list", Array.isArray(devList) && devList.length === 0, JSON.stringify(devList));
    const { data: rachelList } = await rachel.rpc('get_event_participants', { p_event_id: EV.kallang });
    check("Rachel (left) can't see the participant list", Array.isArray(rachelList) && rachelList.length === 0, JSON.stringify(rachelList));
    const { data: hostList } = await sundown.rpc('get_event_participants', { p_event_id: EV.kallang });
    check('Host sees the participant list', hostList?.length === 2, JSON.stringify(hostList));
    const { data: hostView } = await sundown.from('rsvps').select('user_id, status, waitlist_position').eq('event_id', EV.kallang);
    const going = hostView?.filter((r) => r.status === 'yes' && r.waitlist_position === null).length;
    check('Host sees exactly 2 going (capacity respected)', going === 2, JSON.stringify(hostView));
    // (Mei hosts the past event, so test as Rachel.)
    const { error: past } = await rachel.rpc('set_rsvp', { p_event_id: EV.past, p_status: 'yes' });
    check("Can't RSVP to an event that already happened", /started/i.test(errMsg(past)), errMsg(past));
    const { error: own } = await sundown.rpc('set_rsvp', { p_event_id: EV.kallang, p_status: 'yes' });
    check("Host can't RSVP to own event", /hosting/i.test(errMsg(own)), errMsg(own));
    const { error: direct } = await mei.from('rsvps').insert({ event_id: EV.concert, user_id: ID.mei, status: 'no' });
    check("Guests can't write RSVPs directly (must go through the rules)", !!direct, errMsg(direct));
  }

  // ── RSVP-by deadline ─────────────────────────────────────────────────
  section = 'RSVP-by deadline';
  {
    const day = 86400000;
    const { data: evId, error } = await arjun.rpc('save_event', {
      p_event: {
        title: 'Deadline test', status: 'published', visibility: 'public', location: 'Somewhere',
        date_time: new Date(Date.now() + 5 * day).toISOString(), rsvp_by: new Date(Date.now() - day).toISOString(),
      },
      p_questions: [],
    });
    check('Arjun creates an event whose RSVP-by has passed', !!evId, errMsg(error));
    const { error: late } = await rachel.rpc('set_rsvp', { p_event_id: evId, p_status: 'yes' });
    check('Rachel is told RSVPs have closed', /closed/i.test(errMsg(late)), errMsg(late));
    const { error: bad } = await arjun.rpc('save_event', {
      p_event: { title: 'Bad', status: 'published', visibility: 'public', location: 'X',
        date_time: new Date(Date.now() + day).toISOString(), rsvp_by: new Date(Date.now() + 3 * day).toISOString() },
      p_questions: [],
    });
    check('RSVP-by after the start is rejected by the database', !!bad, errMsg(bad));
    const { data: del } = await rachel.from('events').delete().eq('id', evId).select();
    check("Rachel can't delete Arjun's event", !del?.length);
    const { data: del2, error: delErr } = await arjun.from('events').delete().eq('id', evId).select();
    check('Arjun (host) can delete it', del2?.length === 1, errMsg(delErr));
  }

  // ── Host edits keep guests' answers ──────────────────────────────────
  section = 'Editing';
  {
    const count = async () => (await sundown.from('rsvp_answers').select('id, rsvps!inner(event_id)').eq('rsvps.event_id', EV.fiveK)).data?.length ?? 0;
    const before = await count();
    const { data: ev } = await sundown.from('events').select('*').eq('id', EV.fiveK).single();
    const { data: qs } = await sundown
      .from('event_questions').select('id, text, type, position, event_question_options(id, label, position)')
      .eq('event_id', EV.fiveK).order('position');
    const { error } = await sundown.rpc('save_event', {
      p_event: { id: ev.id, title: ev.title + ' (edited)', status: 'published', visibility: 'public',
        location: ev.location, date_time: ev.date_time, ends_at: ev.ends_at ?? '', cover_image: ev.cover_image ?? '' },
      p_questions: qs.map((q) => ({ id: q.id, text: q.text, type: q.type,
        options: q.event_question_options.map((o) => ({ id: o.id, label: o.label })) })),
    });
    const after = await count();
    check("Host renames the 5k without touching questions → guests' answers kept", !error && before > 0 && after === before, `${before} → ${after} ${errMsg(error)}`);
  }

  // ── Feed ─────────────────────────────────────────────────────────────
  section = 'Feed';
  {
    const { data: feed } = await arjun.rpc('get_home_feed', { p_limit: 30 });
    check('Arjun (follows Sundown) sees Sundown hosting Kallang', feed?.some((f) => f.verb === 'hosting' && f.target === 'Kallang night loop'));
    const { data: feedR } = await rachel.rpc('get_home_feed', { p_limit: 30 });
    check("Rachel's feed never shows private events she isn't invited to", !feedR?.some((f) => f.target === 'Kopi + cards night'));
    const { data: feedD } = await dev.rpc('get_home_feed', { p_limit: 30 });
    check('Feed returns at most the requested number of items', (feedD?.length ?? 0) <= 30);
  }

  // ── Storage ──────────────────────────────────────────────────────────
  section = 'Storage';
  {
    const own = `${ID.rachel}/avatar.jpg`;
    const { error: up } = await rachel.storage.from('avatars').upload(own, JPEG, { contentType: 'image/jpeg', upsert: true });
    check('Rachel uploads her own avatar', !up, errMsg(up));
    const { error: up2 } = await rachel.storage.from('avatars').upload(own, JPEG, { contentType: 'image/jpeg', upsert: true });
    check('…and can replace it (upsert)', !up2, errMsg(up2));
    const { error: other } = await rachel.storage.from('avatars').upload(`${ID.dev}/avatar.jpg`, JPEG, { contentType: 'image/jpeg', upsert: true });
    check("Rachel can't upload into Dev's folder", !!other, errMsg(other));
    const { error: png } = await rachel.storage.from('avatars').upload(`${ID.rachel}/x.png`, JPEG, { contentType: 'image/png' });
    check('Non-JPEG uploads are rejected', !!png, errMsg(png));
    const { data: list } = await dev.storage.from('avatars').list(ID.rachel);
    check("Dev can't list Rachel's files", !list?.length);
    const pub = rachel.storage.from('avatars').getPublicUrl(own).data.publicUrl;
    const res = await fetch(pub);
    check('Avatar loads by public link (how the app shows it)', res.status === 200, String(res.status));
    await rachel.storage.from('avatars').remove([own]);
  }

  // ── Report ───────────────────────────────────────────────────────────
  let last = '';
  for (const r of results) {
    if (r.section !== last) { console.log(`\n${r.section}`); last = r.section; }
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `  — ${r.detail}`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = results.some((r) => !r.ok) ? 1 : 0;
})()
  .catch((e) => {
    console.error('CRASH', e);
    process.exitCode = 1;
  })
  .finally(() => {
    console.log('Resetting fake data…');
    reseed();
  });
