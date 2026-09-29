import * as Linking from 'expo-linking';

import type { Question, QuestionType } from '@/components/questionnaire/types';
import { combineDateAndTime } from './format';
import { pickAndUploadImage } from './images';
import { supabase } from './supabase';

export type Person = { id: string; name: string; username: string | null; avatar_url: string | null };

/** Everything the create/edit form holds. Dates are split into day + time like the design. */
export type EventForm = {
  id?: string;
  inviteCode?: string;
  status: 'draft' | 'published';
  title: string;
  coverUrl: string | null;
  multiDay: boolean;
  startDate: Date | null;
  startTime: Date | null;
  endDate: Date | null;
  endTime: Date | null;
  rsvpByOn: boolean;
  rsvpByDate: Date | null;
  rsvpByTime: Date | null;
  location: string;
  mapLink: string;
  visibility: 'public' | 'private';
  /** Public: limit or unlimited. */
  capacityMode: 'limit' | 'unlimited';
  capacity: string;
  /** Private: guests may invite others, up to maxPax. */
  allowGuestInvites: boolean;
  maxPax: string;
  invitees: Person[];
  questions: Question[] | null;
  notes: string;
};

export const emptyEventForm = (): EventForm => ({
  status: 'draft',
  title: '',
  coverUrl: null,
  multiDay: false,
  startDate: null,
  startTime: null,
  endDate: null,
  endTime: null,
  rsvpByOn: false,
  rsvpByDate: null,
  rsvpByTime: null,
  location: '',
  mapLink: '',
  visibility: 'public',
  capacityMode: 'unlimited',
  capacity: '',
  allowGuestInvites: false,
  maxPax: '',
  invitees: [],
  questions: null,
  notes: '',
});

/* ── Form ⇄ database ─────────────────────────────────────────────────── */

function startsAt(form: EventForm) {
  return form.startDate && form.startTime ? combineDateAndTime(form.startDate, form.startTime) : form.startDate;
}

function endsAt(form: EventForm) {
  if (!form.endTime) return null;
  const day = form.multiDay ? form.endDate : form.startDate;
  return day ? combineDateAndTime(day, form.endTime) : null;
}

/** RSVP deadline; with no time picked it means the end of that day. */
function rsvpBy(form: EventForm) {
  if (!form.rsvpByOn || !form.rsvpByDate) return null;
  if (form.rsvpByTime) return combineDateAndTime(form.rsvpByDate, form.rsvpByTime);
  const endOfDay = new Date(form.rsvpByDate);
  endOfDay.setHours(23, 59, 0, 0);
  return endOfDay;
}

/**
 * RSVP-by later than the event's start. Checked live and blocks both Publish and
 * Save draft (the database rejects it too).
 */
export function rsvpByConflict(form: EventForm): string | undefined {
  const start = startsAt(form);
  const rsvp = rsvpBy(form);
  if (!start || !rsvp) return undefined;
  // Start time not picked yet: only a later *day* is a clear conflict.
  if (!form.startTime) {
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return day(rsvp) > day(start) ? 'RSVP-by must be before the event starts' : undefined;
  }
  if (rsvp <= start) return undefined;
  return form.rsvpByTime || rsvp.toDateString() !== start.toDateString()
    ? 'RSVP-by must be before the event starts'
    : 'RSVP-by is the same day as the event — pick a time before it starts';
}

function capacity(form: EventForm) {
  const raw = form.visibility === 'public'
    ? form.capacityMode === 'limit' ? form.capacity : ''
    : form.allowGuestInvites ? form.maxPax : '';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export type FormErrors = Partial<Record<'title' | 'start' | 'end' | 'rsvpBy' | 'location' | 'capacity' | 'questions', string>>;

/** Checks run before Publish. Save draft only needs a title. */
export function validateForPublish(form: EventForm): FormErrors {
  const errors: FormErrors = {};
  const start = startsAt(form);
  const end = endsAt(form);

  if (!form.title.trim()) errors.title = 'Give your event a name';
  if (!form.startDate || !form.startTime) errors.start = 'Pick a start date and time';
  if (form.multiDay && !form.endDate) errors.end = 'Pick an end date';
  if (start && end && end <= start) errors.end = 'Ends before it starts';
  if (form.rsvpByOn && !form.rsvpByDate) errors.rsvpBy = 'Pick an RSVP-by date, or switch it off';
  const rsvpConflict = rsvpByConflict(form);
  if (rsvpConflict) errors.rsvpBy = rsvpConflict;
  if (!form.location.trim()) errors.location = 'Where is it?';

  const cap = capacity(form);
  const wantsCap = form.visibility === 'public' ? form.capacityMode === 'limit' : form.allowGuestInvites;
  if (wantsCap && (!cap || cap < 1)) errors.capacity = 'Enter a number of at least 1';

  if (form.questions?.some((q) => !q.text.trim())) errors.questions = 'Every question needs text';
  else if (form.questions?.some((q) => q.type !== 'short' && q.options.filter((o) => o.label.trim()).length === 0)) {
    errors.questions = 'Choice questions need at least one option';
  }
  return errors;
}

function toPayload(form: EventForm, status: 'draft' | 'published') {
  const event = {
    id: form.id ?? '',
    title: form.title.trim(),
    description: form.notes.trim(),
    date_time: startsAt(form)?.toISOString() ?? '',
    ends_at: endsAt(form)?.toISOString() ?? '',
    rsvp_by: rsvpBy(form)?.toISOString() ?? '',
    location: form.location.trim(),
    map_link: form.mapLink.trim(),
    cover_image: form.coverUrl ?? '',
    capacity: capacity(form)?.toString() ?? '',
    visibility: form.visibility,
    status,
    allow_guest_invites: form.visibility === 'private' && form.allowGuestInvites,
  };
  const questions = (form.questions ?? []).map((q) => ({
    id: q.id,
    text: q.text.trim(),
    type: q.type,
    options: q.type === 'short' ? [] : q.options.filter((o) => o.label.trim()).map((o) => ({ id: o.id, label: o.label.trim() })),
  }));
  return { event, questions };
}

/* ── Reads ───────────────────────────────────────────────────────────── */

export async function loadEventForm(id: string): Promise<EventForm> {
  const [{ data: event, error }, { data: questionRows }, { data: inviteRows }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).single(),
    supabase
      .from('event_questions')
      .select('id, text, type, image_url, position, event_question_options(id, label, position)')
      .eq('event_id', id)
      .order('position'),
    supabase.from('event_invites').select('users!event_invites_invitee_id_fkey(id, name, username, avatar_url)').eq('event_id', id),
  ]);
  if (error) throw error;

  const start = event.date_time ? new Date(event.date_time) : null;
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const rsvp = event.rsvp_by ? new Date(event.rsvp_by) : null;
  const multiDay = !!(start && end && start.toDateString() !== end.toDateString());
  const isPrivate = event.visibility !== 'public';

  const questions: Question[] = (questionRows ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type as QuestionType,
    hasPhoto: !!q.image_url,
    options: [...(q.event_question_options ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((o) => ({ id: o.id, label: o.label })),
  }));

  return {
    id: event.id,
    inviteCode: event.invite_code,
    status: event.status as EventForm['status'],
    title: event.title,
    coverUrl: event.cover_image,
    multiDay,
    startDate: start,
    startTime: start,
    endDate: multiDay ? end : null,
    endTime: end,
    rsvpByOn: !!rsvp,
    rsvpByDate: rsvp,
    rsvpByTime: rsvp,
    location: event.location ?? '',
    mapLink: event.map_link ?? '',
    visibility: isPrivate ? 'private' : 'public',
    capacityMode: !isPrivate && event.capacity ? 'limit' : 'unlimited',
    capacity: !isPrivate && event.capacity ? String(event.capacity) : '',
    allowGuestInvites: event.allow_guest_invites,
    maxPax: isPrivate && event.capacity ? String(event.capacity) : '',
    invitees: (inviteRows ?? []).map((r) => r.users).filter((u): u is Person => !!u),
    questions: questions.length ? questions : null,
    notes: event.description ?? '',
  };
}

export type MyEvent = {
  id: string;
  title: string;
  date_time: string | null;
  location: string | null;
  cover_image: string | null;
  status: string;
  visibility: string;
};

export async function loadMyEvents(userId: string): Promise<MyEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, date_time, location, cover_image, status, visibility')
    .eq('host_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** People the user follows — who they can invite to private events. */
export async function loadFollowing(userId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('users!follows_target_id_fkey(id, name, username, avatar_url)')
    .eq('follower_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.users).filter((u): u is Person => !!u);
}

export type EventPage = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  visibility: string;
  dateTime: string | null;
  endsAt: string | null;
  location: string | null;
  mapLink: string | null;
  coverUrl: string | null;
  notes: string | null;
  capacity: number | null;
  inviteCode: string;
  host: Person;
  isHost: boolean;
  going: Person[];
  maybe: Person[];
  notGoing: Person[];
  /** Invited (or joined by link) but no RSVP yet. */
  pending: Person[];
};

/**
 * Everything the event page (design 11a) shows. RLS decides what comes back:
 * the host sees every RSVP and invite; a guest only their own.
 */
export async function loadEventPage(id: string, viewerId: string): Promise<EventPage> {
  const [{ data: event, error }, { data: rsvpRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from('events')
      .select('*, host:users!events_host_id_fkey(id, name, username, avatar_url)')
      .eq('id', id)
      .single(),
    supabase.from('rsvps').select('status, user:users!rsvps_user_id_fkey(id, name, username, avatar_url)').eq('event_id', id),
    supabase.from('event_invites').select('invitee:users!event_invites_invitee_id_fkey(id, name, username, avatar_url)').eq('event_id', id),
  ]);
  if (error) throw error;

  const rsvps = (rsvpRows ?? []).filter((r): r is typeof r & { user: Person } => !!r.user);
  const byStatus = (status: string) => rsvps.filter((r) => r.status === status).map((r) => r.user);
  const replied = new Set(rsvps.map((r) => r.user.id));
  const pending = (inviteRows ?? [])
    .map((r) => r.invitee)
    .filter((u): u is Person => !!u && !replied.has(u.id));

  return {
    id: event.id,
    title: event.title,
    status: event.status as EventPage['status'],
    visibility: event.visibility,
    dateTime: event.date_time,
    endsAt: event.ends_at,
    location: event.location,
    mapLink: event.map_link,
    coverUrl: event.cover_image,
    notes: event.description,
    capacity: event.capacity,
    inviteCode: event.invite_code,
    host: event.host as Person,
    isHost: event.host_id === viewerId,
    going: byStatus('yes'),
    maybe: byStatus('maybe'),
    notGoing: byStatus('no'),
    pending,
  };
}

/** Opens the host's map link, or searches the address in the phone's maps. */
export function directionsUrl(page: Pick<EventPage, 'mapLink' | 'location'>) {
  if (page.mapLink) return /^https?:\/\//.test(page.mapLink) ? page.mapLink : `https://${page.mapLink}`;
  if (page.location) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(page.location)}`;
  return null;
}

/* ── Writes ──────────────────────────────────────────────────────────── */

/** Saves event + questionnaire in one transaction, then syncs private invites. Returns the event id. */
export async function saveEvent(form: EventForm, status: 'draft' | 'published', userId: string) {
  const { event, questions } = toPayload(form, status);
  const { data: id, error } = await supabase.rpc('save_event', { p_event: event, p_questions: questions });
  if (error) throw error;

  if (form.visibility === 'private') await syncInvites(id, form.invitees, userId);
  return id;
}

async function syncInvites(eventId: string, invitees: Person[], userId: string) {
  const { data: existing, error } = await supabase
    .from('event_invites')
    .select('invitee_id, invited_by')
    .eq('event_id', eventId);
  if (error) throw error;

  const wanted = new Set(invitees.map((p) => p.id));
  const had = new Set((existing ?? []).map((r) => r.invitee_id));

  const toAdd = invitees.filter((p) => !had.has(p.id)).map((p) => ({ event_id: eventId, invitee_id: p.id, invited_by: userId }));
  // Only remove people this host invited directly; guests' invites and link-joins stay.
  const toRemove = (existing ?? [])
    .filter((r) => !wanted.has(r.invitee_id) && r.invited_by === userId)
    .map((r) => r.invitee_id)
    .filter((id) => id !== userId);

  if (toAdd.length) {
    const { error: addError } = await supabase.from('event_invites').insert(toAdd);
    if (addError) throw addError;
  }
  if (toRemove.length) {
    const { error: removeError } = await supabase
      .from('event_invites')
      .delete()
      .eq('event_id', eventId)
      .in('invitee_id', toRemove);
    if (removeError) throw removeError;
  }
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

/** Cover in whatever crop the host picks, up to 1600px wide JPEG at 75% (~200–400 KB). */
export function pickAndUploadCover(userId: string) {
  return pickAndUploadImage({
    bucket: 'event-covers',
    path: `${userId}/${Date.now()}.jpg`,
    width: 1600,
    quality: 0.75,
  });
}

/* ── Invite links ────────────────────────────────────────────────────── */

/** https://<vercel site>/invite/CODE once the web page is set up; an app link until then. */
export function inviteLink(code: string) {
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL?.replace(/\/$/, '');
  return base ? `${base}/invite/${code}` : Linking.createURL(`/invite/${code}`);
}

/** Accepts a full invite link or a bare code; returns the code or null. */
export function parseInviteCode(input: string) {
  const match = input.trim().match(/invite\/([A-Za-z0-9]+)/) ?? input.trim().match(/^([A-Za-z0-9]{6,})$/);
  return match ? match[1].toUpperCase() : null;
}

export type InvitePreview = {
  title: string;
  host_name: string;
  host_avatar_url: string | null;
  date_time: string | null;
  ends_at: string | null;
  location: string | null;
  cover_image: string | null;
  visibility: string;
};

export async function getInvitePreview(code: string): Promise<InvitePreview | null> {
  const { data, error } = await supabase.rpc('get_invite_preview', { code });
  if (error) throw error;
  return (data as InvitePreview | null) ?? null;
}

export async function joinByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_event_by_code', { code });
  if (error) throw error;
  return data;
}
