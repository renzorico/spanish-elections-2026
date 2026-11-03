// Hosting: Vercel settings, visit counter, redirect from the old GitHub address, no stale addresses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { cleanEvent, shouldCount } from '../site/js/analytics.js';

const NEW_SITE = 'https://compara29n.vercel.app/';
const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'));
const metaCsp = (file) => /Content-Security-Policy" content="([^"]+)"/.exec(readFileSync(file, 'utf8'))[1];
const directives = (csp) => Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.split(/\s+/)[0], d]));

test('vercel.json: builds with the tests, serves site/, clean URLs', () => {
  assert.equal(cfg.outputDirectory, 'site');
  assert.match(cfg.buildCommand, /npm test/);
  assert.match(cfg.buildCommand, /npm run build/);
  assert.equal(cfg.cleanUrls, true);
});

test('the CSP header contains every rule of the pages\' meta CSP, plus framing and object bans', () => {
  const all = cfg.headers.find((h) => h.source === '/(.*)').headers;
  const csp = directives(all.find((h) => h.key === 'Content-Security-Policy').value);
  for (const f of ['site/index.html', 'site/eleccion.html', 'site/metodologia.html']) {
    for (const [name, rule] of Object.entries(directives(metaCsp(f)))) assert.equal(csp[name], rule, `${f}: ${name}`);
  }
  assert.equal(csp['frame-ancestors'], "frame-ancestors 'none'");
  assert.equal(csp['object-src'], "object-src 'none'");
  assert.match(csp['script-src'], /^script-src 'self'$/);
  const keys = all.map((h) => h.key);
  for (const k of ['Referrer-Policy', 'X-Content-Type-Options', 'Permissions-Policy']) assert.ok(keys.includes(k), k);
});

test('the data file is never cached stale', () => {
  const data = cfg.headers.find((h) => h.source === '/data/(.*)').headers[0];
  assert.match(data.value, /must-revalidate/);
});

test('visit counter sends only origin + path (never the # part or ? parameters)', () => {
  const loc = { origin: NEW_SITE.slice(0, -1), pathname: '/metodologia', hash: '#r=1.abcde.sss.madrid', search: '?lang=en&hoy=2026-11-29' };
  const e = cleanEvent({ type: 'pageview', url: `${loc.origin}${loc.pathname}${loc.search}${loc.hash}` }, loc);
  assert.equal(e.url, 'https://compara29n.vercel.app/metodologia');
  assert.equal(e.type, 'pageview');
});

test('visit counter runs only on the live site', () => {
  assert.equal(shouldCount('compara29n.vercel.app'), true);
  for (const h of ['localhost', '127.0.0.1', 'renzorico.github.io', 'mi.local', '']) assert.equal(shouldCount(h), false, h);
});

test('the counter loads from our own address and records nothing but page views', () => {
  const src = readFileSync('site/js/analytics.js', 'utf8');
  assert.match(src, /'\/_vercel\/insights\/script\.js'/);
  assert.doesNotMatch(src, /https?:\/\//);
  assert.doesNotMatch(src, /va\('event'|track\(|localStorage|document\.cookie/);
});

test('old GitHub address redirects to the new site and keeps path, language and # links', () => {
  const run = (pathname, search = '', hash = '') => {
    let to = null;
    vm.runInNewContext(readFileSync('redirect/redirect.js', 'utf8'), { location: { pathname, search, hash, replace: (u) => (to = u) } });
    return to;
  };
  assert.equal(run('/spanish-elections-2026/'), NEW_SITE);
  assert.equal(run('/spanish-elections-2026/index.html'), NEW_SITE);
  assert.equal(run('/spanish-elections-2026/metodologia.html', '?lang=en'), `${NEW_SITE}metodologia?lang=en`);
  assert.equal(run('/spanish-elections-2026/', '', '#r=1.abc'), `${NEW_SITE}#r=1.abc`);
  assert.equal(run('/spanish-elections-2026/', '', '#c=1.abc~Ana'), `${NEW_SITE}#c=1.abc~Ana`);
});

test('the Pages workflow redirects only when the new site answers', () => {
  const wf = readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(wf, /curl -fsS --max-time 20 https:\/\/compara29n\.vercel\.app\/data\/bundle\.json/);
  assert.match(wf, /cp -r redirect\/\. _pages\//);
  assert.match(wf, /cp -r site\/\. _pages\//);
});

test('no page, script, calendar or feed still points at the old GitHub address', () => {
  const files = [
    ...['index.html', 'eleccion.html', 'metodologia.html', '29n-es.ics', '29n-en.ics', 'feed.xml'].map((f) => `site/${f}`),
    ...readdirSync('site/js').filter((f) => f !== 'analytics.js').map((f) => `site/js/${f}`), // analytics.js names .github.io on purpose: it skips counting there
    'scripts/publish.mjs',
  ];
  for (const f of files) assert.ok(!/github\.io/.test(readFileSync(f, 'utf8')), `${f} still mentions github.io`);
  for (const f of ['site/index.html', 'site/eleccion.html', 'site/metodologia.html']) {
    const s = readFileSync(f, 'utf8');
    assert.ok(new RegExp(`rel="canonical" href="${NEW_SITE.replace(/\./g, '\\.')}`).test(s), `${f} canonical`);
    assert.ok(s.includes(`og:image" content="${NEW_SITE}og.png"`), `${f} og:image`);
  }
});
