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
