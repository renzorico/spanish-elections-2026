// Browser regression tests for the questionnaire and results (audit D-001..D-008, F-007,
// plus the redesigned flow: always-available Next, province switching on results,
// topic accordions in party detail, PDF/PNG export).
// Needs Playwright: `npm i --no-save playwright && npx playwright install chromium`, then `npm run test:browser`.
// Serves site/ itself on a free port; run `npm run build` first so site/data/bundle.json is current.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..', 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const file = path.join(ROOT, path.normalize(url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    return res.end('not found');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const ok = (c, m) => {
  console.log((c ? 'PASS ' : 'FAIL ') + m);
  if (!c) process.exitCode = 1;
};

(async () => {
  await new Promise((r) => server.listen(0, r));
  const BASE = `http://localhost:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text()));
  const qtext = () => p.locator('#q-text').textContent();

  await p.goto(BASE);
  ok(await p.locator('.hero h1').count() === 1, 'home hero renders');
  await p.click('[data-act=start]');
  await p.selectOption('#prov', 'barcelona');
  ok(/de los 13/.test(await p.locator('#prov-count').textContent()), 'province screen shows how many parties run there');
  await p.click('[data-act=province-next]');

  // Explain-it-simply and context panels
  await p.click('[data-act=toggle-simple]');
  ok(await p.locator('#exp-simple').isVisible(), 'plain-language explanation opens');
  ok(/«De acuerdo»/.test(await p.locator('#exp-simple').textContent()), 'explanation says what "agree" means');
  await p.click('[data-act=toggle-context]');
  ok((await p.locator('#exp-context').isVisible()) && !(await p.locator('#exp-simple').isVisible()), 'context replaces the explanation');

  // D-002: arrow keys must not advance
  const q1 = await qtext();
  await p.locator('input[name=answer]').first().focus();
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(400);
  ok((await qtext()) === q1, 'D-002 arrow key keeps the same question');
  ok((await p.locator('#scale-value').textContent()).length > 0, 'D-002 chosen answer is shown and announced');
  await p.keyboard.press('3');
  ok((await p.locator('#scale-value').textContent()) === 'Neutral', 'digit keys answer (3 = Neutral)');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  ok((await qtext()) !== q1, 'Enter moves to the next question');

  // Next is always present, even unanswered ("Saltar"), and pointer choices auto-advance
  ok(/Saltar/.test(await p.locator('#q-next').textContent()), 'Next is available on an unanswered question (Skip)');
  const q2 = await qtext();
  await p.click('.stop[data-v="2"]');
  await p.waitForTimeout(500);
  ok((await qtext()) !== q2, 'pointer choice advances to the next question');
  await p.click('[data-act=auto-off]');
  const q3 = await qtext();
  await p.click('.stop[data-v="1"]');
  await p.waitForTimeout(500);
  ok((await qtext()) === q3, 'with auto-advance off a pointer choice only saves');
  await p.click('[data-act=auto-on]');

  // Previous / Next to re-check an answer without changing it (user request)
  await p.click('[data-act=q-prev]');
  ok((await qtext()) === q2 && (await p.locator('input[name=answer]:checked').count()) === 1, 'Previous shows the earlier answer');
  await p.click('#q-next');
  ok((await qtext()) === q3, 'Next moves on without changing the answer');

  // D-001: reference page mid-quiz keeps answers; browser Back works
  await p.click('header a[href="metodologia.html"]');
  await p.waitForSelector('#ref-body h1');
  ok(await p.waitForSelector('#coverage table', { timeout: 5000 }).then(() => true).catch(() => false), 'D-001 methodology opens inside the app with the coverage table');
  await p.click('[data-act=close-ref]');
  await p.waitForSelector('#q-text');
  ok((await qtext()) === q3, 'D-001 returning from the reference page restores the same question');
  await p.click('header a[href="eleccion.html"]');
  await p.waitForSelector('#ref-body .steps');
  await p.goBack();
  await p.waitForSelector('#q-text');
  ok((await qtext()) === q3, 'D-001 browser Back from a reference page restores the question');
  await p.click('#q-next');
  const q4 = await qtext();
  await p.goBack();
  await p.waitForSelector('#q-text');
  ok((await qtext()) === q3, 'browser Back steps to the previous question');
  await p.goForward();
  await p.waitForSelector('#q-text');
  ok((await qtext()) === q4, 'browser Forward returns');

  // finish the questionnaire
  p.on('dialog', (d) => d.accept());
  for (let i = 0; i < 40; i++) {
    if (await p.locator('.wrows').count()) break;
    await p.click('.stop[data-v="2"]');
    await p.waitForTimeout(330);
  }
  // topic weights: Less / Same / More per topic (option B)
  ok((await p.locator('.wrow').count()) === 11, 'weights screen lists all 11 topics');
  ok((await p.locator('.wseg button[aria-pressed="true"]').count()) === 11 && (await p.locator('.wseg button[data-weight="1"][aria-pressed="true"]').count()) === 11, 'all topics start at "Same"');
  await p.click('[data-weight-topic="vivienda"][data-weight="2"]');
  await p.click('[data-weight-topic="sanidad"][data-weight="2"]');
  await p.click('[data-weight-topic="trabajo"][data-weight="0.5"]');
  ok((await p.locator('[data-weight-topic="vivienda"][data-weight="2"]').getAttribute('aria-pressed')) === 'true', 'a topic can be set to "More"');
  ok(/2 con más peso · 1 con menos peso/.test(await p.locator('#wstatus').textContent()), 'weights summary updates');
  await p.click('[data-act=results]');
  await p.waitForSelector('.pcard');
  const inBarcelona = await p.locator('.pcard').count();
  ok(inBarcelona > 0 && inBarcelona < 13, `results show only parties running in Barcelona (${inBarcelona})`);

  // change province / all of Spain from the results page (user request)
  await p.selectOption('[data-control=province]', '');
  await p.waitForTimeout(150);
  ok((await p.locator('.pcard').count()) === 13, 'switching to all of Spain shows all 13 parties');
  await p.selectOption('[data-control=province]', 'las-palmas');
  await p.waitForTimeout(150);
  ok((await p.locator('.flag', { hasText: 'En coalición' }).count()) > 0, 'coalition members flagged for Las Palmas');

  // topic map with labels and explicit no-data marker
  ok((await p.locator('.heat .hlab').count()) === 11, 'topic map has a visible label for each topic');

  // party detail: topic accordions, not one long list (user request)
  await p.locator('.pcard').first().click();
  await p.waitForSelector('.detail-head');
  ok((await p.locator('.tdet').count()) === 11 && (await p.locator('.tdet[open]').count()) === 0, 'party detail shows 11 collapsed topics');
  ok((await p.locator('.srow:visible').count()) === 0, 'statements are hidden until a topic is opened');
  await p.locator('.tdet > summary').first().click();
  ok((await p.locator('.srow:visible').count()) > 0, 'opening a topic shows its statements');
  ok((await p.locator('.tdet[open] a[href*="issues/new"]').count()) > 0, 'D-008 correction links present');
  await p.goBack();
  await p.waitForSelector('.pcard');
  ok(true, 'browser Back returns from party detail to results');

  // D-003: reviewing unchanged answers
  await p.click('[data-act=edit-answers]');
  const r1 = await qtext();
  ok((await p.locator('input[name=answer]:checked').count()) === 1, 'D-003 current answer is restored in review');
  await p.click('#q-next');
  ok((await qtext()) !== r1, 'D-003 Next moves on, answer kept');
  await p.click('[data-act=back-to-results]');
  await p.waitForSelector('.pcard');

  // D-005: 320px reflow on results and party detail
  await p.setViewportSize({ width: 320, height: 800 });
  let sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 320, `D-005 results: no horizontal overflow at 320px (scrollWidth ${sw})`);
  await p.locator('.pcard').first().click();
  await p.waitForSelector('.detail-head');
  await p.locator('.tdet > summary').first().click();
  sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 320, `D-005 party detail: no horizontal overflow at 320px (scrollWidth ${sw})`);
  await p.click('[data-act=results]');
  await p.waitForSelector('.pcard');
  await p.setViewportSize({ width: 1000, height: 900 });

  // share card exports
  let [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=pdf]')]);
  const pdfPath = await dl.path();
  const head = fs.readFileSync(pdfPath).subarray(0, 8).toString();
  ok(head.startsWith('%PDF-1.4'), 'PDF download is a PDF file');
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=share]')]);
  const png = fs.readFileSync(await dl.path());
  ok(png.subarray(1, 4).toString() === 'PNG', 'share image falls back to a PNG download');

  // F-007 + D-004: restart resets everything and asks first
  await p.click('[data-order=match]');
  await p.check('[data-control=excludeLow]');
  let asked = false;
  p.removeAllListeners('dialog');
  p.on('dialog', (d) => {
    asked = true;
    d.accept();
  });
  await p.click('[data-act=restart]');
  ok(asked, 'D-004 restart asks for confirmation');
  await p.waitForSelector('[data-act=start]');
  await p.click('[data-act=start]');
  await p.click('[data-act=province-next]');
  for (let i = 0; i < 40; i++) {
    if (await p.locator('.wrows').count()) break;
    await p.click('[data-act=q-skip]');
  }
  await p.click('[data-act=results]');
  ok((await p.locator('.panel', { hasText: /ninguna afirmación/ }).count()) === 1, 'all skipped: explanatory empty state, no invented scores');
  ok(errs.length === 0, 'no console errors ' + JSON.stringify(errs));
  await b.close();
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
