// Downloads (if missing) the official Congreso vote JSON for every vote in
// data/votes/curated.json and writes per-party tallies to data/votes/derived.json.
//
//   node scripts/fetch_votes.mjs            # use cached raw files, download missing
//   node scripts/fetch_votes.mjs --refresh  # re-download everything
//
// Downloads use curl so the environment's HTTPS proxy settings are honoured.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { DATA, readJSON, tallyVote, stanceFromMajority } from './lib.mjs';

const refresh = process.argv.includes('--refresh');
const parties = readJSON(join(DATA, 'parties.json'));
const curated = readJSON(join(DATA, 'votes', 'curated.json'), []);
const deputyMap = readJSON(join(DATA, 'votes', 'deputies.json'), { deputies: {} }).deputies;
const rawDir = join(DATA, 'votes', 'raw');
mkdirSync(rawDir, { recursive: true });

const derived = { generated_on: new Date().toISOString().slice(0, 10), votes: {} };
const failures = [];

for (const v of curated) {
  const rawPath = join(rawDir, `${v.id}.json`);
  if (refresh || !existsSync(rawPath)) {
    try {
      execFileSync('curl', ['-sSfL', '-A', 'Mozilla/5.0', '-o', rawPath, v.url_json], { stdio: 'pipe', timeout: 60000 });
    } catch (e) {
      failures.push(`${v.id}: download failed (${v.url_json})`);
      continue;
    }
  }
  let json;
  try {
    json = readJSON(rawPath);
  } catch (e) {
    failures.push(`${v.id}: invalid JSON in ${rawPath}`);
    continue;
  }
  const byParty = tallyVote(json, parties, deputyMap);
  for (const t of Object.values(byParty)) t.implied_stance = stanceFromMajority(t.majority, v.yes_means);
  derived.votes[v.id] = {
    statement: v.statement,
    date: v.date,
    yes_means: v.yes_means,
    title: json.informacion?.textoExpediente || v.title,
    subgroup: [json.informacion?.tituloSubGrupo, json.informacion?.textoSubGrupo].filter(Boolean).join(' — ') || null,
    totals: json.totales,
    by_party: byParty,
  };
}

writeFileSync(join(DATA, 'votes', 'derived.json'), JSON.stringify(derived, null, 2) + '\n');
console.log(`Derived ${Object.keys(derived.votes).length}/${curated.length} votes → data/votes/derived.json`);
if (failures.length) {
  console.error('Failures:\n  ' + failures.join('\n  '));
  process.exitCode = 1;
}
