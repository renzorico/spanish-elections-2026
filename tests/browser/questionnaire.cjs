// Browser regression tests for the questionnaire (audit D-001..D-008, F-007).
// Needs Playwright: `npm i --no-save playwright && npx playwright install chromium`, then `npm run test:browser`.
// Serves site/ itself on a free port; run `npm run build` first so site/data/bundle.json is current.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..', 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join(ROOT, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  await new Promise((r) => server.listen(0, r));
  const BASE = `http://localhost:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const qtext = () => p.locator('#q-text').textContent();
  await p.goto(BASE);
  await p.click('[data-act=start]'); await p.selectOption('#prov', 'barcelona'); await p.click('[data-act=province-next]');

  // D-002: arrow keys must not advance
  const q1 = await qtext();
  await p.locator('input[name=answer]').first().focus();
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(400);
  ok((await qtext()) === q1, 'D-002 arrow key keeps the same question');
  ok(await p.locator('#q-next').isEnabled(), 'D-002 Continue enabled after keyboard selection');
  ok((await p.locator('#saved').textContent()).length > 0, 'D-002 saved status announced');
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowLeft');
  ok((await qtext()) === q1, 'D-002 several arrow presses stay on the question');
  await p.click('#q-next');
  ok((await qtext()) !== q1, 'Continue moves to the next question');

  // pointer choice auto-advances (announced)
  const q2 = await qtext();
  await p.click('.answer:has(input[value="2"])');
  await p.waitForTimeout(500);
  ok((await qtext()) !== q2, 'pointer choice advances to the next question');
  await p.uncheck('[data-toggle=autoAdvance]');
  const q3 = await qtext();
  await p.click('.answer:has(input[value="1"])'); await p.waitForTimeout(500);
  ok((await qtext()) === q3, 'with auto-advance off a pointer choice only saves');
  await p.click('#q-next');

  // D-001: reference page mid-quiz keeps answers
  const q4 = await qtext();
  await p.click('header a[href="metodologia.html"]');
  await p.waitForSelector('#ref h1');
  ok(await p.locator('#coverage table').count() > 0 || (await p.waitForSelector('#coverage table', { timeout: 5000 }).then(() => true).catch(() => false)), 'D-001 methodology opens inside the app with the coverage table');
  await p.click('#ref [data-act=close-ref]');
  await p.waitForSelector('#q-text');
  ok((await qtext()) === q4, 'D-001 returning from the reference page restores the same question');
  await p.click('header a[href="eleccion.html"]'); await p.waitForSelector('#ref h1');
  await p.goBack(); await p.waitForSelector('#q-text');
  ok((await qtext()) === q4, 'D-001 browser Back from a reference page restores the question');

  // finish: answer all remaining quickly via keyboard+Continue
  p.on('dialog', (d) => d.accept());
  await p.check('[data-toggle=autoAdvance]');
  for (let i = 0; i < 40; i++) {
    if (await p.locator('[data-act=results]').count()) break;
    if (await p.locator('#q-text').count()) { await p.click('.answer:has(input[value="2"])'); await p.waitForTimeout(260); }
  }
  await p.click('[data-act=results]');
  await p.waitForSelector('.party');
  ok(await p.locator('.party').count() > 0, 'results shown');

  // D-003: reviewing unchanged answers
  await p.click('[data-act=edit-answers]');
  const r1 = await qtext();
  ok(await p.locator('input[name=answer]:checked').count() === 1, 'D-003 current answer is restored in review');
  ok(await p.locator('#q-next').isEnabled(), 'D-003 Continue available without changing the answer');
  await p.click('#q-next');
  ok((await qtext()) !== r1, 'D-003 Continue moves on, answer kept');
  ok(await p.locator('[data-act=back-to-results]').count() === 1, 'D-003 direct way back to results');
  await p.click('[data-act=back-to-results]');
  await p.waitForSelector('.party');

  // D-005/D-007: 320px reflow with expanded details; column headers
  await p.setViewportSize({ width: 320, height: 800 });
  await p.locator('.party details > summary').first().click();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 320, `D-005 no horizontal overflow at 320px (scrollWidth ${sw})`);
  ok(await p.locator('table.topics').first().locator('thead th').count().then((n) => n === 2), 'D-007 topic table has column headers');
  ok(/documentad/.test(await p.locator('table.topics small.cov').first().textContent()), 'D-007 coverage text explains the counts');
  ok(await p.locator('.party a[href*="issues/new"]').count() > 0, 'D-008 correction links present');

  // F-007 + D-004: restart resets everything and asks first
  await p.setViewportSize({ width: 1000, height: 900 });
  await p.check('[data-toggle=sortByMatch]'); await p.check('[data-toggle=excludeLow]');
  let asked = false; p.removeAllListeners('dialog'); p.on('dialog', (d) => { asked = true; d.accept(); });
  await p.click('[data-act=restart]');
  ok(asked, 'D-004 restart asks for confirmation');
  await p.waitForSelector('[data-act=start]');
  await p.click('[data-act=start]'); await p.click('[data-act=province-next]');
  for (let i = 0; i < 40; i++) { if (await p.locator('[data-act=results]').count()) break; await p.click('[data-act=q-skip]'); }
  await p.click('[data-act=results]');
  ok(!(await p.locator('[data-toggle=sortByMatch]').isChecked()) && !(await p.locator('[data-toggle=excludeLow]').isChecked()), 'F-007 result preferences reset after restart');
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
