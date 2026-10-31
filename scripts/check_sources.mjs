// Checks that every source URL in data/positions/*.json and votes/curated.json
// resolves (HTTP < 400). Writes data/source_check.json and prints failures.
// Uses curl so the environment proxy is honoured. Run: npm run check-sources
import { writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { DATA, loadAll } from './lib.mjs';

const run = promisify(execFile);
const d = loadAll();
const urls = new Map();
for (const [pid, doc] of Object.entries(d.positions)) {
  for (const pos of doc.positions) for (const s of pos.sources || []) {
    if (!urls.has(s.url)) urls.set(s.url, []);
    urls.get(s.url).push(`${pid}:${pos.statement}`);
  }
}
for (const v of d.curated) {
  if (!urls.has(v.url_json)) urls.set(v.url_json, []);
  urls.get(v.url_json).push(`vote:${v.id}`);
}

async function status(url) {
  try {
    const { stdout } = await run('curl', ['-sSL', '-o', '/dev/null', '-w', '%{http_code}', '-A', 'Mozilla/5.0', '--max-time', '30', '-r', '0-2047', url]);
    return Number(stdout.trim());
  } catch {
    return 0;
  }
}

const list = [...urls.keys()];
const results = {};
const CONC = 8;
for (let i = 0; i < list.length; i += CONC) {
  const batch = list.slice(i, i + CONC);
  const codes = await Promise.all(batch.map(status));
  batch.forEach((u, k) => (results[u] = { status: codes[k], used_by: urls.get(u) }));
}
const failing = Object.entries(results).filter(([, r]) => !(r.status >= 200 && r.status < 400));
writeFileSync(join(DATA, 'source_check.json'), JSON.stringify({ checked_on: new Date().toISOString().slice(0, 10), total: list.length, failing: failing.length, results }, null, 2) + '\n');
console.log(`${list.length} URLs checked, ${failing.length} failing`);
for (const [u, r] of failing) console.log(`  ${r.status} ${u}  (${r.used_by.slice(0, 3).join(', ')}${r.used_by.length > 3 ? ', …' : ''})`);
