import type { Href } from 'expo-router';

import type { QuestionType } from '@/components/questionnaire/types';
import type { Database } from './database.types';
import { supabase } from './supabase';

export type RsvpStatus = Database['public']['Enums']['rsvp_status'];

/**
 * Link to the "You're going" / questionnaire screen. Cast because the dev
 * server's generated route list sometimes lags behind new files.
 */
export const rsvpHref = (eventId: string) => `/events/${eventId}/rsvp` as Href;

export type RsvpResult = { status: RsvpStatus | null; waitlisted: boolean; waitlist_rank: number | null };

/**
 * The only way the app writes RSVPs. The database enforces visibility, the
 * RSVP-by deadline, start time, capacity (waitlist) and promotes from the waitlist.
 * Pass null to clear ("Undo").
 */
export async function setRsvp(eventId: string, status: RsvpStatus | null): Promise<RsvpResult> {
  const { data, error } = await supabase.rpc('set_rsvp', {
    p_event_id: eventId,
    // null = clear; the generated type doesn't mark the parameter nullable.
    p_status: status as RsvpStatus,
  });
  if (error) throw error;
  return data as unknown as RsvpResult;
}

export type FollowedPerson = { id: string; name: string; avatar_url: string | null };

export type EventSocial = {
  going_count: number;
  waitlist_count: number;
  followed_going_count: number;
  followed_going: FollowedPerson[];
  my_status: RsvpStatus | null;
  my_waitlist_rank: number;
  rsvp_open: boolean;
  has_questions: boolean;
};

/** Counts, "people you follow going" and your own RSVP — null if you can't see the event. */
export async function loadEventSocial(eventId: string): Promise<EventSocial | null> {
  const { data, error } = await supabase.rpc('get_event_social', { p_event_id: eventId });
  if (error) throw error;
  return (data as unknown as EventSocial | null) ?? null;
}

/** "Rachel, Dev + 6 you follow are going" / "43 going". */
export function socialLine(social: EventSocial) {
  const names = social.followed_going.slice(0, 2).map((p) => p.name.split(' ')[0]);
  const others = social.followed_going_count - names.length;
  if (names.length) {
    return `${names.join(', ')}${others > 0 ? ` + ${others} you follow` : ''} ${social.followed_going_count === 1 ? 'is' : 'are'} going`;
  }
  return social.going_count ? `${social.going_count} going` : 'Be the first to say yes';
}

export type GoingEvent = {
  event_id: string;
  title: string;
  date_time: string | null;
  ends_at: string | null;
  location: string | null;
  cover_image: string | null;
  waitlisted: boolean;
  going_count: number;
};

export async function loadMyGoing(): Promise<GoingEvent[]> {
  const { data, error } = await supabase.rpc('get_my_going');
  if (error) throw error;
  return (data as unknown as GoingEvent[]) ?? [];
}

export type MyInvite = {
  event_id: string;
  title: string;
  date_time: string | null;
  location: string | null;
  cover_image: string | null;
  inviter_name: string;
  inviter_avatar_url: string | null;
  friends_going: number;
  has_questions: boolean;
  my_status: RsvpStatus | null;
};

export async function loadMyInvites(): Promise<MyInvite[]> {
  const { data, error } = await supabase.rpc('get_my_invites');
  if (error) throw error;
  return (data as unknown as MyInvite[]) ?? [];
}

/* ── Questionnaire (guest side) ──────────────────────────────────────── */

export type GuestQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  options: { id: string; label: string }[];
};

export async function loadQuestions(eventId: string): Promise<GuestQuestion[]> {
  const { data, error } = await supabase
    .from('event_questions')
    .select('id, text, type, position, event_question_options(id, label, position)')
    .eq('event_id', eventId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type as QuestionType,
    options: [...(q.event_question_options ?? [])].sort((a, b) => a.position - b.position).map(({ id, label }) => ({ id, label })),
  }));
}

/** Per question: chosen option ids, the short-text answer, and follow-up text per option (allergies). */
export type Answers = Record<string, { optionIds: string[]; text: string; optionText: Record<string, string> }>;

export async function loadMyAnswers(eventId: string, userId: string): Promise<Answers> {
  const { data: rsvp } = await supabase.from('rsvps').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (!rsvp) return {};
  const { data, error } = await supabase.from('rsvp_answers').select('question_id, option_id, text_answer').eq('rsvp_id', rsvp.id);
  if (error) throw error;

  const answers: Answers = {};
  for (const row of data ?? []) {
    const a = (answers[row.question_id] ??= { optionIds: [], text: '', optionText: {} });
    if (row.option_id) {
      a.optionIds.push(row.option_id);
      if (row.text_answer) a.optionText[row.option_id] = row.text_answer;
    } else if (row.text_answer) {
      a.text = row.text_answer;
    }
  }
  return answers;
}

export async function saveAnswers(eventId: string, questions: GuestQuestion[], answers: Answers) {
  const payload = questions.flatMap((q) => {
    const a = answers[q.id];
    if (!a) return [];
    if (q.type === 'short') return a.text.trim() ? [{ question_id: q.id, text_answer: a.text.trim() }] : [];
    return a.optionIds.map((optionId) => ({
      question_id: q.id,
      option_id: optionId,
      text_answer: a.optionText[optionId]?.trim() ?? '',
    }));
  });
  const { error } = await supabase.rpc('save_rsvp_answers', { p_event_id: eventId, p_answers: payload });
  if (error) throw error;
}

/** Every question answered (choice questions need a pick; short text needs words). */
export function missingAnswers(questions: GuestQuestion[], answers: Answers) {
  return questions.filter((q) => {
    const a = answers[q.id];
    return q.type === 'short' ? !a?.text.trim() : !a?.optionIds.length;
  }).length;
}
