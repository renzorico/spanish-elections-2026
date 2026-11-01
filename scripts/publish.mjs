// Static files generated at build time: calendar (.ics) and Atom feed of updates.
// Pure functions (unit-tested); build.mjs writes their output into site/.
export const SITE = 'https://renzorico.github.io/spanish-elections-2026/';

const ymd = (iso) => iso.replace(/-/g, '');
const nextDay = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const prevDay = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
// RFC 5545 text escaping and 75-octet line folding.
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, 'utf8') > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const EVENTS = {
  es: (e) => [
    { id: 'campaign', start: e.campaign.start, end: nextDay(e.campaign.end), title: 'Campaña electoral (elecciones generales)', desc: 'Del 13 al 27 de noviembre. ¿Con qué partidos coincides? Haz el test: ' + SITE },
    { id: 'reflection', start: prevDay(e.date), end: e.date, title: 'Jornada de reflexión', desc: 'No se puede hacer campaña. Repasa cómo se vota y qué hay en tu papeleta: ' + SITE },
    { id: 'election', start: e.date, end: nextDay(e.date), title: 'Elecciones generales: hoy se vota', desc: 'Colegios abiertos de 9:00 a 20:00. Lleva DNI, pasaporte o carné de conducir. Tu papeleta y cómo se vota: ' + SITE, alarm: 'PT8H30M' },
    { id: 'convene', start: e.chambers_convene, end: nextDay(e.chambers_convene), title: 'Se constituyen el nuevo Congreso y el nuevo Senado', desc: 'Después empieza la investidura del presidente. Cómo funciona: ' + SITE + 'eleccion.html' },
  ],
  en: (e) => [
    { id: 'campaign', start: e.campaign.start, end: nextDay(e.campaign.end), title: 'Election campaign (Spanish general election)', desc: '13 to 27 November. Which parties do you agree with? Take the quiz: ' + SITE + '?lang=en' },
    { id: 'reflection', start: prevDay(e.date), end: e.date, title: 'Day of reflection (Spain)', desc: 'No campaigning allowed. Check how voting works and what is on your ballot: ' + SITE + '?lang=en' },
    { id: 'election', start: e.date, end: nextDay(e.date), title: 'Spanish general election: polling day', desc: 'Polling stations open 9:00 to 20:00. Bring your DNI, passport or driving licence. Your ballot and how to vote: ' + SITE + '?lang=en', alarm: 'PT8H30M' },
    { id: 'convene', start: e.chambers_convene, end: nextDay(e.chambers_convene), title: 'New Congreso and Senate convene', desc: 'The investiture of the Prime Minister follows. How it works: ' + SITE + 'eleccion.html?lang=en' },
  ],
};

/** iCalendar file with the key dates (all-day events; a reminder at 8:30 on polling day). */
export function buildIcs(election, lang = 'es', stamp = '2026-11-01') {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//29N//Elecciones generales 2026//' + lang.toUpperCase(), 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsText(lang === 'es' ? 'Elecciones generales 29N' : 'Spanish election 29N')}`, 'X-WR-TIMEZONE:Europe/Madrid'];
  for (const ev of EVENTS[lang](election)) {
    lines.push('BEGIN:VEVENT', `UID:29n-2026-${ev.id}-${lang}@renzorico.github.io`, `DTSTAMP:${ymd(stamp)}T000000Z`, `DTSTART;VALUE=DATE:${ymd(ev.start)}`, `DTEND;VALUE=DATE:${ymd(ev.end)}`, `SUMMARY:${icsText(ev.title)}`, `DESCRIPTION:${icsText(ev.desc)}`, `URL:${SITE}`, 'TRANSP:TRANSPARENT');
    if (ev.alarm) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(ev.title)}`, `TRIGGER:${ev.alarm}`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

const xml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Atom feed of the public changelog (Spanish text, English below). */
export function buildFeed(entries) {
  const updated = (entries[0]?.date || '2026-10-31') + 'T00:00:00Z';
  const items = entries
    .map((e, i) => `  <entry>
    <id>${SITE}#novedad-${e.date}-${entries.length - i}</id>
    <title>${xml(e.es)}</title>
    <updated>${e.date}T00:00:00Z</updated>
    <link href="${SITE}"/>
    <category term="${xml(e.type)}"/>
    <content type="text">${xml(`${e.es}\n\n${e.en}`)}</content>
  </entry>`)
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="es">
  <title>29N · Novedades</title>
  <subtitle>Cambios en los datos y en la herramienta independiente para las elecciones generales del 29 de noviembre de 2026.</subtitle>
  <id>${SITE}</id>
  <link href="${SITE}"/>
  <link rel="self" href="${SITE}feed.xml"/>
  <updated>${updated}</updated>
  <author><name>29N</name></author>
${items}
</feed>
`;
}
