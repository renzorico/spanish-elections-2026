// Election phases, computed from the calendar in bundle.election (Madrid time).
// Pure functions, shared with the unit tests.

/** Today's date in Madrid as YYYY-MM-DD. `override` (from ?hoy=YYYY-MM-DD) is used for previews and tests. */
export function madridToday(override, now = new Date()) {
  if (typeof override === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(now);
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * pre (before the campaign) · campaign · reflection (day before) · election (polling day)
 * · post (until Parliament convenes) · legislature (from the day Parliament convenes)
 */
export function electionPhase(today, election) {
  const reflection = addDays(election.date, -1);
  if (today < election.campaign.start) return 'pre';
  if (today < reflection) return 'campaign';
  if (today === reflection) return 'reflection';
  if (today === election.date) return 'election';
  if (today < election.chambers_convene) return 'post';
  return 'legislature';
}

/** Whole days from `today` to `iso` (negative when past). */
export function daysUntil(today, iso) {
  return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}
