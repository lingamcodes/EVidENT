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
