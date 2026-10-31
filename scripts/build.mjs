// Builds site/data/bundle.json — the only file the static site loads.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadAll } from './lib.mjs';

const d = loadAll();

const election = {
  date: '2026-11-29',
  campaign: { start: '2026-11-13', end: '2026-11-27' },
  chambers_convene: '2026-12-23',
  decree: {
    title: 'Real Decreto 806/2026, de 5 de octubre, de disolución del Congreso de los Diputados y del Senado y de convocatoria de elecciones',
    boe_date: '2026-10-06',
    url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20742',
  },
};

const positions = {};
const coverage = {};
for (const p of d.parties) {
  const doc = d.positions[p.id];
  positions[p.id] = {};
  const c = { coded: 0, no_clear_position: 0, high: 0, medium: 0, low: 0 };
  for (const pos of doc?.positions || []) {
    positions[p.id][pos.statement] = {
      stance: pos.stance,
      confidence: pos.confidence || null,
      evidence_type: pos.evidence_type,
      sources: (pos.sources || []).map(({ url, title, publisher, date, quote, page }) => ({ url, title, publisher, date, quote, page })),
      vote_refs: pos.vote_refs || [],
      note: pos.note || null,
    };
    if (pos.stance === 'no_clear_position') c.no_clear_position++;
    else {
      c.coded++;
      c[pos.confidence]++;
    }
  }
  coverage[p.id] = c;
}

const votes = {};
for (const v of d.curated) {
  const der = d.derived.votes?.[v.id];
  votes[v.id] = {
    statement: v.statement,
    date: v.date,
    title: v.title,
    url: v.url_json,
    yes_means: v.yes_means,
    relation: v.relation,
    note: v.note || null,
    by_party: der
      ? Object.fromEntries(Object.entries(der.by_party).map(([pid, t]) => [pid, { yes: t.yes, no: t.no, abstain: t.abstain, absent: t.absent, majority: t.majority }]))
      : null,
  };
}

const bundle = {
  generated_on: new Date().toISOString().slice(0, 10),
  election,
  topics: d.topics,
  statements: d.statements,
  parties: d.parties.map(({ vote_match, ...rest }) => ({ ...rest, coverage: coverage[rest.id] })),
  positions,
  votes,
  provinces: d.provincesDoc.provinces || [],
  provinces_source: d.provincesDoc.source || null,
  candidacies: d.candidacies,
};

mkdirSync(join(ROOT, 'site', 'data'), { recursive: true });
writeFileSync(join(ROOT, 'site', 'data', 'bundle.json'), JSON.stringify(bundle));
console.log(`bundle.json: ${d.parties.length} parties, ${d.statements.length} statements, ${Object.keys(votes).length} votes, ${bundle.provinces.length} provinces`);
