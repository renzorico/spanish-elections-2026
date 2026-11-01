// Return-visit features: phases, comparison between two people, links, calendar and feed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { electionPhase, madridToday, daysUntil } from '../site/js/phase.js';
import { peerAgreement } from '../site/js/compare.js';
import { encodeRestore, decodeRestore, encodeCompare, decodeCompare } from '../site/js/restore.js';
import { buildIcs, buildFeed } from '../scripts/publish.mjs';

const bundle = JSON.parse(readFileSync('site/data/bundle.json', 'utf8'));
const E = bundle.election;

test('election phases follow the official calendar', () => {
  assert.equal(electionPhase('2026-11-01', E), 'pre');
  assert.equal(electionPhase('2026-11-13', E), 'campaign');
  assert.equal(electionPhase('2026-11-27', E), 'campaign');
  assert.equal(electionPhase('2026-11-28', E), 'reflection');
  assert.equal(electionPhase('2026-11-29', E), 'election');
  assert.equal(electionPhase('2026-11-30', E), 'post');
  assert.equal(electionPhase('2026-12-23', E), 'legislature');
  assert.equal(daysUntil('2026-11-01', '2026-11-29'), 28);
  assert.equal(madridToday('2026-11-29'), '2026-11-29');
  assert.equal(madridToday('not-a-date', new Date('2026-11-01T23:30:00Z')), '2026-11-02'); // Madrid is UTC+1
});

test('comparison between two people counts only statements both answered', () => {
  const st = [{ id: 'a', topic: 't1' }, { id: 'b', topic: 't1' }, { id: 'c', topic: 't2' }];
  const tp = [{ id: 't1' }, { id: 't2' }];
  const r = peerAgreement(st, tp, { a: 2, b: -2, c: 1 }, { a: 2, b: 2, c: null });
  assert.equal(r.n, 2);
  assert.equal(r.overall, 0.5); // a: 1, b: 0
  assert.deepEqual(r.topics.map((x) => [x.topic, x.agreement, x.n]), [['t1', 0.5, 2], ['t2', null, 0]]);
});

test('report link carries the data date; old links without it still work', () => {
  const args = { statements: bundle.statements, topics: bundle.topics, answers: {}, weights: {}, province: 'madrid' };
  const withStamp = encodeRestore({ ...args, stamp: '2026-10-31' });
  assert.match(withStamp, /\.madrid\.20261031$/);
  assert.equal(decodeRestore(withStamp, bundle).stamp, '2026-10-31');
  assert.equal(decodeRestore(encodeRestore(args), bundle).stamp, null);
});

test('compare link round-trips answers and an optional, sanitised name; no province or weights', () => {
  const answers = Object.fromEntries(bundle.statements.map((s, i) => [s.id, (i % 5) - 2]));
  const payload = encodeCompare({ statements: bundle.statements, topics: bundle.topics, answers, weights: { vivienda: 2 } }, '  Ana <b>  ');
  const r = decodeCompare(payload, bundle);
  assert.deepEqual(r.answers, answers);
  assert.equal(r.name, 'Ana b');
  assert.ok(!payload.includes('madrid'));
  assert.equal(decodeCompare('9.bad', bundle), null);
});

test('calendar file has the four key dates, a polling-day reminder and valid line endings', () => {
  for (const lang of ['es', 'en']) {
    const ics = buildIcs(E, lang, '2026-11-01');
    assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 4);
    assert.match(ics, /DTSTART;VALUE=DATE:20261129/);
    assert.match(ics, /DTSTART;VALUE=DATE:20261128/);
    assert.match(ics, /DTSTART;VALUE=DATE:20261113\r\nDTEND;VALUE=DATE:20261128/);
    assert.match(ics, /BEGIN:VALARM/);
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, line);
    assert.ok(!/[^\r]\n/.test(ics), 'bare LF');
  }
});

test('feed lists the changelog newest first and escapes text', () => {
  const xml = buildFeed([{ date: '2026-11-02', type: 'data', es: 'A & B <c>', en: 'x' }, { date: '2026-10-31', type: 'site', es: 'y', en: 'z' }]);
  assert.match(xml, /<updated>2026-11-02T00:00:00Z<\/updated>/);
  assert.match(xml, /A &amp; B &lt;c&gt;/);
  assert.equal((xml.match(/<entry>/g) || []).length, 2);
});
