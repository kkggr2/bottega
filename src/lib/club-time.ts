/** "Thursday 12 December, 19:00" in the meeting's time zone. Used on the page and in reminders. */
export function meetingWhen(iso: string, tz?: string, locale = "en-GB"): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: tz };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(d);
  }
}

/** The viewer's time zone, for saving with a meeting. */
export const localTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
};
