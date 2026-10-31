// Exports: restore link, neutral insights and the vector PDF writer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeRestore, decodeRestore } from '../site/js/restore.js';
import { computeInsights, topicRanges, layoutReport, layoutShare, parseQr, SHARE } from '../site/js/report.js';
import { PdfDoc, winAnsiCodes, measure, wrap } from '../site/js/pdf.js';
import { STRINGS } from '../site/js/i18n.js';

const bundle = JSON.parse(readFileSync('site/data/bundle.json', 'utf8'));

test('restore link round-trips answers, weights and province', () => {
  const answers = {};
  bundle.statements.forEach((s, i) => (answers[s.id] = i % 6 === 5 ? null : (i % 5) - 2));
  const weights = Object.fromEntries(bundle.topics.map((t, i) => [t.id, [0.5, 1, 2][i % 3]]));
  const payload = encodeRestore({ statements: bundle.statements, topics: bundle.topics, answers, weights, province: 'madrid' });
  assert.match(payload, /^1\.[a-e_]+\.[lsm]+\.madrid$/);
  const r = decodeRestore(payload, bundle);
  assert.deepEqual(r.answers, answers);
  assert.deepEqual(r.weights, weights);
  assert.equal(r.province, 'madrid');
});

test('restore link rejects other versions, wrong lengths and unknown provinces', () => {
  assert.equal(decodeRestore('2.abc.lsm.', bundle), null);
  assert.equal(decodeRestore('1.abc.lsm.', bundle), null);
  const ok = encodeRestore({ statements: bundle.statements, topics: bundle.topics, answers: {}, weights: {}, province: '' });
  assert.ok(decodeRestore(ok, bundle));
  const bad = ok.replace(/\.$/, '.atlantis');
  assert.equal(decodeRestore(bad, bundle).province, '');
  assert.equal(decodeRestore(ok.replace(/^1\._/, '1.z'), bundle), null);
});

test('insights describe spread and topic ranges using only parties with enough data', () => {
  const topics = [{ id: 'a' }, { id: 'b' }];
  const parties = [
    { pct: 0.6, limited: false, topics: { a: 1, b: 0.5 } },
    { pct: 0.5, limited: false, topics: { a: 0, b: 0.5 } },
    { pct: 0.4, limited: false, topics: { a: 0.5, b: 0.6 } },
    { pct: 0.99, limited: true, topics: { a: 1, b: 1 } },
  ];
  const ins = computeInsights(parties, topics);
  assert.deepEqual(ins.spread, { max: 60, min: 40, diff: 20, n: 3 });
  assert.equal(ins.mostDivergent.topic, 'a');
  assert.equal(ins.leastDivergent.topic, 'b');
});

test('WinAnsi encoding covers Spanish text and widths come from the font', () => {
  assert.deepEqual(winAnsiCodes('¿Sí? «ñ» €—'), [0xbf, 0x53, 0xed, 0x3f, 0x20, 0xab, 0xf1, 0xbb, 0x20, 0x80, 0x97]);
  const m = JSON.parse(readFileSync('site/fonts/pdf/metrics.json', 'utf8'))['atkinson-400'];
  assert.ok(measure(m, 'WWW', 10) > measure(m, 'iii', 10));
  for (const line of wrap(m, 'Las administraciones deberían poder limitar el precio del alquiler', 10, 120)) assert.ok(measure(m, line, 10) <= 120 || !line.includes(' '));
});

function fonts() {
  const metrics = JSON.parse(readFileSync('site/fonts/pdf/metrics.json', 'utf8'));
  const map = { serif: 'fraunces-700', serifMed: 'fraunces-500', sans: 'atkinson-400', sansBold: 'atkinson-700' };
  return Object.fromEntries(Object.entries(map).map(([k, f]) => [k, { metrics: metrics[f], bytes: new Uint8Array(readFileSync(`site/fonts/pdf/${metrics[f].file}`)) }]));
}

function sampleData(lang = 'es') {
  const topics = bundle.topics.map((t) => ({ id: t.id, label: t.label[lang], short: t.label[lang].split(' ')[0], accent: '#555555', tint: '#eeeeee', answered: 2, total: 2 }));
  const parties = bundle.parties.map((p, i) => ({ id: p.id, name: p.name, mono: p.name.slice(0, 3), pct: 0.4 + i / 50, withPos: 20, answeredCount: 30, limited: i > 10, topics: Object.fromEntries(topics.map((t, j) => [t.id, j === 0 ? null : j === 1 ? 'skip' : (i + j) % 5 / 4])) }));
  return {
    S: STRINGS[lang].report,
    lang,
    dateLabel: 'Generado el 1 de noviembre de 2026',
    dateShort: '1 nov 2026',
    place: 'Madrid',
    answered: 30,
    total: 30,
    moreTopics: ['Vivienda'],
    moreTopicsFull: [{ label: 'Vivienda', accent: '#8b5c3f', tint: '#ffece1' }],
    lessTopics: [],
    topics,
    parties,
    answerRows: bundle.statements.map((s, k) => ({ topicId: s.topic, text: s.text[lang], user: k % 7 === 0 ? null : (k % 5) - 2, cells: parties.map((p, i) => ({ stance: ['agree', 'disagree', 'neutral', null][(i + k) % 4], agreement: (i + k) % 4 === 3 ? null : ((i + k) % 5) / 4 })) })),
    topicWeights: Object.fromEntries(bundle.topics.map((t, i) => [t.id, [0.5, 1, 2][i % 3]])),
    restoreUrl: 'https://example.org/#r=1.abc',
    siteUrl: 'https://example.org/',
    siteLabel: 'example.org',
    qr: parseQr(readFileSync('site/img/qr.svg', 'utf8')),
  };
}

test('full report: valid multi-page PDF with embedded fonts, selectable text and the restore link', async () => {
  const doc = new PdfDoc({ fonts: fonts(), title: 'Informe' });
  const pages = layoutReport(doc, sampleData());
  assert.ok(pages >= 3 && pages <= 4, `pages: ${pages}`);
  const bytes = await doc.toBytes();
  const txt = Buffer.from(bytes).toString('latin1');
  assert.ok(txt.startsWith('%PDF-1.4'));
  assert.ok(txt.trimEnd().endsWith('%%EOF'));
  assert.equal((txt.match(/\/FontFile2/g) || []).length, 4);
  assert.equal((txt.match(/\/Type \/Page\b/g) || []).length, pages);
  assert.match(txt, /\/URI \(https:\/\/example\.org\/#r=1\.abc\)/);
  // xref offsets point at the objects
  const startxref = Number(/startxref\n(\d+)/.exec(txt)[1]);
  assert.equal(txt.slice(startxref, startxref + 4), 'xref');
  const first = /xref\n0 \d+\n0000000000 65535 f \n(\d{10})/.exec(txt.slice(startxref))[1];
  assert.equal(txt.slice(Number(first), Number(first) + 7), '1 0 obj');
});

test('shared summary: one page, no answers and no restore link', async () => {
  const f = fonts();
  const doc = new PdfDoc({ width: SHARE.w, height: SHARE.h, fonts: f, title: 'Resumen' });
  const page = doc.addPage();
  layoutShare(page, sampleData(), f);
  const ops = page.ops.join('\n');
  assert.doesNotMatch(ops, /De acuerdo/);
  assert.equal(page.links.length, 1);
  assert.equal(page.links[0].url, 'https://example.org/');
  const txt = Buffer.from(await doc.toBytes()).toString('latin1');
  assert.equal((txt.match(/\/Type \/Page\b/g) || []).length, 1);
});

test('English report and summary lay out without errors', async () => {
  const f = fonts();
  const doc = new PdfDoc({ fonts: f, title: 'Report' });
  assert.ok(layoutReport(doc, sampleData('en')) >= 3);
  const s = new PdfDoc({ width: SHARE.w, height: SHARE.h, fonts: f });
  layoutShare(s.addPage(), sampleData('en'), f);
  assert.ok((await s.toBytes()).length > 1000);
});

test('topic ranges use only parties with enough data and need at least two values', () => {
  const topics = [{ id: 'a' }, { id: 'b' }];
  const parties = [
    { pct: 0.6, limited: false, topics: { a: 0.9, b: 0.5 } },
    { pct: 0.5, limited: false, topics: { a: 0.3, b: 'skip' } },
    { pct: 0.9, limited: true, topics: { a: 1, b: 1 } },
  ];
  const r = topicRanges(parties, topics);
  assert.deepEqual(r[0], { topic: 'a', min: 30, max: 90 });
  assert.deepEqual(r[1], { topic: 'b', min: null, max: null });
});
