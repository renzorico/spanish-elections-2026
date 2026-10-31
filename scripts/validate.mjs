// Validates every data file against data/SCHEMA.md, checks cross-references,
// compares coded stances with linked Congreso votes, and lints wording for
// loaded terms. Exit code 1 on any error.
//
//   node scripts/validate.mjs [--strict]   (--strict: warnings also fail)
import { loadAll, stanceFromMajority } from './lib.mjs';

export const STANCES = ['agree', 'neutral', 'disagree', 'no_clear_position'];
export const CONFIDENCES = ['high', 'medium', 'low'];
export const EVIDENCE = ['vote_xv', 'program_2026', 'program_2023', 'official_statement', 'none'];

// Terms that carry a political charge in Spanish public debate. Applied to all
// text the tool itself authors (statements, context, topic labels, notes, UI).
// Matching is accent- and case-insensitive on word starts.
export const LOADED_TERMS = [
  'okupa', 'ilegal', 'ilegales', 'invasion', 'invasor', 'avalancha', 'mena', 'menas',
  'adoctrinamiento', 'adoctrinar', 'golpista', 'golpe', 'chiringuito', 'paguita',
  'privilegio', 'regimen del 78', 'ideologia de genero', 'feminazi', 'facha', 'fascista',
  'comunista', 'bolivariano', 'filoetarra', 'terrorista', 'traidor', 'traicion',
  'expolio', 'robo', 'saqueo', 'casta', 'separatista', 'separatistas', 'secesionista',
  'ultraderecha', 'extrema derecha', 'extrema izquierda', 'ultraizquierda', 'populista',
  'progre', 'facherio', 'cayetano', 'woke', 'lawfare', 'colonos', 'genocidio',
  'illegal alien', 'illegals', 'invasion', 'far-right', 'far-left', 'radical',
];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function findLoadedTerms(text) {
  if (!text) return [];
  // Official titles quoted in «…» are reproduced verbatim and exempt.
  const t = ' ' + norm(text.replace(/«[^»]*»/g, ' ')).replace(/[^a-z0-9ñ\- ]/g, ' ') + ' ';
  return LOADED_TERMS.filter((term) => t.includes(' ' + norm(term) + ' ') || t.includes(' ' + norm(term) + 's '));
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function validate(data) {
  const errors = [];
  const warnings = [];
  const { parties, topics, statements, positions, curated, derived, provincesDoc, candidacies } = data;
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const uniq = (arr, label) => {
    const seen = new Set();
    for (const x of arr) {
      if (seen.has(x.id)) err(`${label}: duplicate id ${x.id}`);
      seen.add(x.id);
    }
    return seen;
  };
  const topicIds = uniq(topics, 'topics');
  const stmtIds = uniq(statements, 'statements');
  const partyIds = uniq(parties, 'parties');
  const voteIds = uniq(curated, 'votes/curated');

  // --- topics & statements
  for (const t of topics) {
    if (!t.label?.es || !t.label?.en) err(`topic ${t.id}: label.es and label.en required`);
  }
  for (const s of statements) {
    if (!topicIds.has(s.topic)) err(`statement ${s.id}: unknown topic ${s.topic}`);
    for (const lang of ['es', 'en']) {
      if (!s.text?.[lang]) err(`statement ${s.id}: text.${lang} missing`);
      if (!s.context?.[lang]) err(`statement ${s.id}: context.${lang} missing`);
      for (const term of findLoadedTerms(s.text?.[lang])) err(`statement ${s.id}: loaded term "${term}" in text.${lang}`);
      for (const term of findLoadedTerms(s.context?.[lang])) err(`statement ${s.id}: loaded term "${term}" in context.${lang}`);
      if ((s.text?.[lang] || '').length > 200) warn(`statement ${s.id}: text.${lang} longer than 200 chars`);
    }
  }
  for (const t of topics) {
    const n = statements.filter((s) => s.topic === t.id).length;
    if (n === 0) err(`topic ${t.id}: no statements`);
  }

  // --- parties
  for (const p of parties) {
    if (!['statewide', 'regional'].includes(p.scope)) err(`party ${p.id}: bad scope`);
    if (!['pending', 'published'].includes(p.program_2026?.status)) err(`party ${p.id}: program_2026.status must be pending|published`);
    if (p.program_2026?.status === 'published' && !p.program_2026.url) err(`party ${p.id}: published program needs url`);
    if (!positions[p.id]) err(`party ${p.id}: no positions file data/positions/${p.id}.json`);
  }

  // --- positions
  for (const [pid, doc] of Object.entries(positions)) {
    if (!partyIds.has(pid)) {
      err(`positions/${pid}.json: unknown party`);
      continue;
    }
    const seen = new Set();
    for (const pos of doc.positions || []) {
      const where = `positions/${pid}.json [${pos.statement}]`;
      if (!stmtIds.has(pos.statement)) err(`${where}: unknown statement`);
      if (seen.has(pos.statement)) err(`${where}: duplicate statement`);
      seen.add(pos.statement);
      if (!STANCES.includes(pos.stance)) err(`${where}: bad stance ${pos.stance}`);
      const ncp = pos.stance === 'no_clear_position';
      if (ncp) {
        if (pos.confidence) err(`${where}: no_clear_position must not have a confidence`);
      } else {
        if (!CONFIDENCES.includes(pos.confidence)) err(`${where}: bad/missing confidence`);
        if (pos.evidence_type === 'none') err(`${where}: evidence_type none only allowed with no_clear_position`);
      }
      if (!EVIDENCE.includes(pos.evidence_type)) err(`${where}: bad evidence_type ${pos.evidence_type}`);
      if (!Array.isArray(pos.sources) || pos.sources.length === 0) err(`${where}: at least one source required`);
      for (const src of pos.sources || []) {
        if (!/^https?:\/\//.test(src.url || '')) err(`${where}: source url missing/invalid`);
        if (src.date && !ISO.test(src.date)) err(`${where}: source date not ISO (${src.date})`);
        if (!src.date && !ncp) warn(`${where}: source without date`);
        if (!ncp && !src.quote && pos.evidence_type !== 'vote_xv') err(`${where}: quote required for coded positions`);
        if (src.quote && src.quote.split(/\s+/).length > 60) warn(`${where}: quote longer than 60 words`);
      }
      if (pos.evidence_type === 'vote_xv' && !(pos.vote_refs || []).length && !(pos.sources || []).some((s) => /congreso\.es/.test(s.url))) {
        err(`${where}: vote_xv evidence needs vote_refs or a congreso.es source`);
      }
      if (pos.evidence_type === 'vote_xv' && !ncp) {
        const direct = (pos.vote_refs || []).some((r) => curated.find((v) => v.id === r)?.relation === 'direct');
        const hasQuote = (pos.sources || []).some((s) => s.quote && !/congreso\.es/.test(s.url));
        if (!direct && !hasQuote) err(`${where}: vote_xv coding needs a direct curated vote (related votes alone never justify a coding)`);
      }
      for (const term of findLoadedTerms(pos.note)) warn(`${where}: loaded term "${term}" in note`);

      // Cross-check with Congreso votes
      for (const ref of pos.vote_refs || []) {
        if (!voteIds.has(ref)) {
          err(`${where}: unknown vote_ref ${ref}`);
          continue;
        }
        const d = derived.votes?.[ref];
        if (!d) {
          warn(`${where}: vote ${ref} not yet derived (run npm run votes)`);
          continue;
        }
        const tally = d.by_party?.[pid];
        const implied = tally ? stanceFromMajority(tally.majority, d.yes_means) : null;
        if (implied && !ncp && implied !== pos.stance && !pos.note) {
          err(`${where}: coded ${pos.stance} but vote ${ref} implies ${implied}; add a note explaining the difference`);
        }
      }
    }
    for (const s of statements) if (!seen.has(s.id)) err(`positions/${pid}.json: missing statement ${s.id}`);
  }

  // --- votes
  for (const v of curated) {
    if (!stmtIds.has(v.statement)) err(`vote ${v.id}: unknown statement ${v.statement}`);
    if (!['agree', 'disagree'].includes(v.yes_means)) err(`vote ${v.id}: yes_means must be agree|disagree`);
    if (!['direct', 'related'].includes(v.relation)) err(`vote ${v.id}: relation must be direct|related`);
    if (!/^https:\/\/www\.congreso\.es\//.test(v.url_json || '')) err(`vote ${v.id}: url_json must be a congreso.es URL`);
    if (!ISO.test(v.date || '')) err(`vote ${v.id}: date not ISO`);
    for (const term of findLoadedTerms(v.note)) err(`vote ${v.id}: loaded term "${term}" in note (quote official titles in «…»)`);
  }

  // --- provinces & candidacies
  const provinces = provincesDoc.provinces || [];
  const provIds = new Set(provinces.map((p) => p.id));
  if (provinces.length && provinces.length !== 52) err(`provinces.json: expected 52 constituencies, got ${provinces.length}`);
  const seats = provinces.reduce((a, p) => a + (p.seats_congreso_2026 || 0), 0);
  if (provinces.length && seats !== 350) err(`provinces.json: seats sum to ${seats}, expected 350`);
  if (candidacies) {
    if (!['presented', 'proclaimed', '2023_fallback'].includes(candidacies.status)) err('candidacies.json: bad status');
    for (const [prov, list] of Object.entries(candidacies.by_province || {})) {
      if (provIds.size && !provIds.has(prov)) err(`candidacies.json: unknown province ${prov}`);
      for (const pid of list) if (!partyIds.has(pid)) err(`candidacies.json: unknown party ${pid} in ${prov}`);
    }
    for (const prov of provIds) if (!candidacies.by_province?.[prov]) warn(`candidacies.json: no entry for ${prov}`);
  }

  return { errors, warnings };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, warnings } = validate(loadAll());
  for (const w of warnings) console.warn('WARN  ' + w);
  for (const e of errors) console.error('ERROR ' + e);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  if (errors.length || (process.argv.includes('--strict') && warnings.length)) process.exitCode = 1;
}
