// Checks that every source URL in data/positions/*.json and votes/curated.json
// resolves. Writes data/source_check.json and exits non-zero on genuine failures.
//
// Classification (see classifyStatus):
//   ok            2xx / 3xx
//   blocked       401 / 403 / 406 / 429 / 451 — the site refuses automated clients. This is NOT
//                 proof the link is dead. Each blocked URL must be listed, with a reason and a
//                 review date, in data/source_allow.json; unlisted blocked URLs need review and fail.
//   failing       404 / 410 / other 4xx / 5xx / transport error (after one retry)
//
// The checker never tries to defeat bot protection: it sends a plain User-Agent only.
// Uses curl so the environment proxy is honoured. Run: npm run check-sources
import { writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { DATA, loadAll, readJSON } from './lib.mjs';

const run = promisify(execFile);
const BLOCKED = new Set([401, 403, 406, 429, 451]);

export function classifyStatus(code) {
  if (code >= 200 && code < 400) return 'ok';
  if (BLOCKED.has(code)) return 'blocked';
  return 'failing';
}

/** Pure core, injectable for tests. `fetchStatus(url)` resolves to an HTTP status (0 = transport error). */
export async function checkUrls(urls, { fetchStatus, allow = {}, concurrency = 8, retries = 1 }) {
  const list = [...urls.keys()];
  const results = {};
  const probe = async (u) => {
    let code = await fetchStatus(u);
    for (let i = 0; i < retries && code === 0; i++) code = await fetchStatus(u);
    return code;
  };
  for (let i = 0; i < list.length; i += concurrency) {
    const batch = list.slice(i, i + concurrency);
    const codes = await Promise.all(batch.map(probe));
    batch.forEach((u, k) => {
      const klass = classifyStatus(codes[k]);
      const reviewed = klass === 'blocked' && allow[u]?.reason && allow[u]?.reviewed;
      results[u] = { status: codes[k], class: klass === 'blocked' && reviewed ? 'blocked_reviewed' : klass, used_by: urls.get(u) };
    });
  }
  const failing = Object.entries(results).filter(([, r]) => r.class === 'failing');
  const needsReview = Object.entries(results).filter(([, r]) => r.class === 'blocked');
  return { results, failing, needsReview };
}

async function curlStatus(url) {
  try {
    const { stdout } = await run('curl', ['-sSL', '-o', '/dev/null', '-w', '%{http_code}', '-A', 'Mozilla/5.0', '--max-time', '30', '-r', '0-2047', url]);
    return Number(stdout.trim());
  } catch {
    return 0;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const d = loadAll();
  const urls = new Map();
  const add = (u, who) => {
    if (!urls.has(u)) urls.set(u, []);
    urls.get(u).push(who);
  };
  for (const [pid, doc] of Object.entries(d.positions)) for (const pos of doc.positions) for (const s of pos.sources || []) add(s.url, `${pid}:${pos.statement}`);
  for (const v of d.curated) add(v.url_json, `vote:${v.id}`);
  const allow = readJSON(join(DATA, 'source_allow.json'), {});

  const { results, failing, needsReview } = await checkUrls(urls, { fetchStatus: curlStatus, allow });
  writeFileSync(
    join(DATA, 'source_check.json'),
    JSON.stringify({ checked_on: new Date().toISOString().slice(0, 10), total: urls.size, failing: failing.length, needs_review: needsReview.length, results }, null, 2) + '\n',
  );
  const show = (title, rows) => {
    if (!rows.length) return;
    console.log(title);
    for (const [u, r] of rows) console.log(`  ${r.status} ${u}  (${r.used_by.slice(0, 3).join(', ')}${r.used_by.length > 3 ? ', …' : ''})`);
  };
  console.log(`${urls.size} URLs checked: ${failing.length} failing, ${needsReview.length} blocked and not yet reviewed, ${Object.values(results).filter((r) => r.class === 'blocked_reviewed').length} blocked and reviewed`);
  show('FAILING (dead or unreachable):', failing);
  show('BLOCKED, needs review (add to data/source_allow.json with a reason and date, or replace the source):', needsReview);
  if (failing.length || needsReview.length) process.exitCode = 1;
}
