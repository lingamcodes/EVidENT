import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Href } from 'expo-router';
import { Share } from 'react-native';

import type { Person } from './events';
import { supabase } from './supabase';

export const responsesHref = (eventId: string) => `/events/${eventId}/responses` as Href;

/* Host side of the RSVP questionnaire: every going guest's answers, a per-question
 * summary, flags on "important" questions, and export (text or CSV). The host can
 * read their guests' answers through RLS; nobody else can. */

export type ResponseQuestion = {
  id: string;
  text: string;
  type: 'short' | 'mc' | 'check';
  important: boolean;
  options: { id: string; label: string }[];
};

/** One guest's answer to one question. */
export type GuestAnswer = {
  /** Chosen options, with any follow-up text (e.g. which allergies). */
  options: { id: string; label: string; detail: string | null }[];
  /** Short-text answer. */
  text: string | null;
};

export type GuestResponse = {
  person: Person;
  waitlisted: boolean;
  answers: Record<string, GuestAnswer>;
  /** Readable notes for answers to important questions that need attention. */
  flags: string[];
};

export type EventResponses = { questions: ResponseQuestion[]; guests: GuestResponse[] };

/** Answers like these mean "nothing to flag". */
const NOTHING = /^(nil|none|no|nope|n\.?\s?a\.?|-+|nothing|not applicable|no allerg(y|ies))$/i;
const meaningful = (s: string | null | undefined) => !!s && !!s.trim() && !NOTHING.test(s.trim());

/** Readable answer: "Allergies (peanuts)", "S", "6:30/km"… */
export function answerText(a: GuestAnswer | undefined) {
  if (!a) return '—';
  if (a.text) return a.text;
  if (!a.options.length) return '—';
  return a.options.map((o) => (o.detail ? `${o.label} (${o.detail})` : o.label)).join(', ');
}

function flagsFor(questions: ResponseQuestion[], answers: Record<string, GuestAnswer>) {
  return questions
    .filter((q) => q.important)
    .flatMap((q) => {
      const a = answers[q.id];
      if (!a) return [];
      const hit = meaningful(a.text) || a.options.some((o) => meaningful(o.label) || meaningful(o.detail));
      return hit ? [`${q.text}: ${answerText(a)}`] : [];
    });
}

export async function loadResponses(eventId: string): Promise<EventResponses> {
  const [{ data: qRows, error: qErr }, { data: rRows, error: rErr }] = await Promise.all([
    supabase
      .from('event_questions')
      .select('id, text, type, important, position, event_question_options(id, label, position)')
      .eq('event_id', eventId)
      .order('position'),
    supabase
      .from('rsvps')
      .select(
        'created_at, waitlist_position, user:users!rsvps_user_id_fkey(id, name, username, avatar_url), rsvp_answers(question_id, option_id, text_answer)',
      )
      .eq('event_id', eventId)
      .eq('status', 'yes')
      .order('created_at'),
  ]);
  if (qErr) throw qErr;
  if (rErr) throw rErr;

  const questions: ResponseQuestion[] = (qRows ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type as ResponseQuestion['type'],
    important: q.important,
    options: [...(q.event_question_options ?? [])].sort((a, b) => a.position - b.position).map((o) => ({ id: o.id, label: o.label })),
  }));
  const label = new Map(questions.flatMap((q) => q.options.map((o) => [o.id, o.label] as const)));

  const guests: GuestResponse[] = (rRows ?? [])
    .filter((r): r is typeof r & { user: Person } => !!r.user)
    .map((r) => {
      const answers: Record<string, GuestAnswer> = {};
      for (const row of r.rsvp_answers ?? []) {
        const a = (answers[row.question_id] ??= { options: [], text: null });
        if (row.option_id) {
          a.options.push({ id: row.option_id, label: label.get(row.option_id) ?? '?', detail: row.text_answer?.trim() || null });
        } else if (row.text_answer?.trim()) {
          a.text = row.text_answer.trim();
        }
      }
      return { person: r.user, waitlisted: r.waitlist_position !== null, answers, flags: flagsFor(questions, answers) };
    });

  return { questions, guests };
}

/** Per option: who picked it (choice questions). */
export function optionPickers(q: ResponseQuestion, guests: GuestResponse[]) {
  return q.options.map((o) => ({
    option: o,
    people: guests.filter((g) => g.answers[q.id]?.options.some((x) => x.id === o.id)),
  }));
}

/* ── Export ──────────────────────────────────────────────────────────── */

const firstName = (p: Person) => p.name.split(' ')[0];

/** A plain-text summary to paste into WhatsApp / notes. */
export function responsesAsText(title: string, { questions, guests }: EventResponses) {
  const lines = [`${title} — responses (${guests.length})`];
  const flagged = guests.filter((g) => g.flags.length);
  if (flagged.length) {
    lines.push('', '⚠ Needs attention');
    for (const g of flagged) lines.push(`• ${g.person.name}: ${g.flags.join('; ')}`);
  }
  for (const q of questions) {
    lines.push('', q.text);
    if (q.type === 'short') {
      for (const g of guests) if (g.answers[q.id]?.text) lines.push(`• ${firstName(g.person)}: ${g.answers[q.id].text}`);
    } else {
      for (const { option, people } of optionPickers(q, guests)) {
        lines.push(`• ${option.label} — ${people.length}${people.length ? ` (${people.map((p) => firstName(p.person)).join(', ')})` : ''}`);
        for (const p of people) {
          const detail = p.answers[q.id]?.options.find((x) => x.id === option.id)?.detail;
          if (detail) lines.push(`    ${firstName(p.person)}: ${detail}`);
        }
      }
    }
  }
  return lines.join('\n');
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** One row per guest, one column per question — opens in Sheets / Excel. */
export function responsesAsCsv({ questions, guests }: EventResponses) {
  const header = ['Name', 'Username', 'Status', 'Needs attention', ...questions.map((q) => q.text)];
  const rows = guests.map((g) => [
    g.person.name,
    g.person.username ? `@${g.person.username}` : '',
    g.waitlisted ? 'Waitlist' : 'Going',
    g.flags.join('; '),
    ...questions.map((q) => (g.answers[q.id] ? answerText(g.answers[q.id]) : '')),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export async function shareResponsesText(title: string, responses: EventResponses) {
  await Share.share({ message: responsesAsText(title, responses) });
}

export async function shareResponsesCsv(title: string, responses: EventResponses) {
  const safe = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event';
  const file = new File(Paths.cache, `${safe}-responses.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(responsesAsCsv(responses));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: `${title} — responses`,
  });
}
