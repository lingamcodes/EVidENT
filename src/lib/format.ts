/** Display helpers matching the design's formats ("Tue 19 Aug 2026", "6.45pm"). */

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours < 12 ? 'am' : 'pm';
  const h = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${h}${suffix}` : `${h}.${String(minutes).padStart(2, '0')}${suffix}`;
}

/** "Sat 30 Aug · 7.30am", as used on event cards. */
export function formatWhen(iso: string | null) {
  if (!iso) return 'Date not set';
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${formatTime(d)}`;
}

/** Keeps the calendar day of `day` and the clock time of `time`. */
export function combineDateAndTime(day: Date, time: Date) {
  const combined = new Date(day);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

/** "Sunday 24 August" — the big date line on the event page. */
export function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Event page date + time lines, covering single-day and multi-day events. */
export function formatEventWhen(startIso: string | null, endIso: string | null) {
  if (!startIso) return { date: 'Date to be confirmed', time: '' };
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  if (end && end.toDateString() !== start.toDateString()) {
    const short = (d: Date) => d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
    return { date: `${short(start)} – ${short(end)}`, time: `${formatTime(start)} – ${formatTime(end)}` };
  }
  return { date: formatLongDate(start), time: end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start) };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Countdown badge on "You're going" cards: "in 40 min", "in 4 hrs", "in 3 days". */
export function relativeUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Now';
  if (ms < HOUR) return `in ${Math.max(1, Math.round(ms / MINUTE))} min`;
  if (ms < DAY) {
    const hrs = Math.round(ms / HOUR);
    return `in ${hrs} hr${hrs === 1 ? '' : 's'}`;
  }
  const days = Math.round(ms / DAY);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/** Feed timestamps: "Just now", "12 min ago", "3 hrs ago", "Yesterday", "Mon 18 Aug". */
export function timeAgo(iso: string) {
  const then = new Date(iso);
  const ms = Date.now() - then.getTime();
  if (ms < MINUTE) return 'Just now';
  if (ms < HOUR) return `${Math.round(ms / MINUTE)} min ago`;
  if (ms < DAY) {
    const hrs = Math.round(ms / HOUR);
    return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  }
  if (ms < 2 * DAY) return 'Yesterday';
  return then.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}
