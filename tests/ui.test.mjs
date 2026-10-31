import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS } from '../site/js/i18n.js';
import { findLoadedTerms } from '../scripts/validate.mjs';

function flatten(v) {
  if (typeof v === 'string') return [v];
  if (typeof v === 'function') return [String(v('presented')), String(v(1, 2))].filter((s) => !s.includes('undefined'));
  if (Array.isArray(v)) return v.flatMap(flatten);
  if (v && typeof v === 'object') return Object.values(v).flatMap(flatten);
  return [];
}

test('UI strings contain no loaded terms', () => {
  for (const lang of ['es', 'en']) for (const s of flatten(STRINGS[lang])) assert.deepEqual(findLoadedTerms(s), [], s);
});

test('ES and EN UI dictionaries have the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.es).sort(), Object.keys(STRINGS.en).sort());
});

test('UI never labels a party as recommended or best', () => {
  const banned = /recomend|recommend|mejor opci|best match|ganador|winner|top match/i;
  for (const lang of ['es', 'en']) for (const s of flatten(STRINGS[lang])) assert.ok(!banned.test(s), s);
  for (const f of ['site/index.html', 'site/js/app.js']) assert.ok(!banned.test(readFileSync(f, 'utf8')), f);
});

test('frontend makes no third-party requests and uses no storage', () => {
  const src = ['site/index.html', 'site/js/app.js', 'site/js/page.js', 'site/js/match.js', 'site/css/style.css']
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
  assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(src), 'storage API used');
  const urls = src.match(/(?:src|href)=["']https?:\/\/[^"']+/g) || [];
  assert.deepEqual(urls, []);
  assert.ok(!/fetch\(\s*['"]https?:/.test(src), 'external fetch');
});

test('results default to random order (sorting is opt-in)', () => {
  const app = readFileSync('site/js/app.js', 'utf8');
  assert.match(app, /sortByMatch: false/);
  assert.match(app, /partyOrder = shuffle\(/);
  assert.match(app, /statementOrder = shuffle\(/);
});
