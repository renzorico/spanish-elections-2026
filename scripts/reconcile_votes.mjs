// Reconciles coded positions with the curated Congreso votes. Idempotent.
//
// For each party × statement:
//  * attaches vote_refs for every curated vote on that statement in which the
//    party took part (majority yes/no/abstain);
//  * if the position is "no_clear_position" and all DIRECT votes imply the same
//    agree/disagree stance → codes it from the vote (high). Abstentions and
//    RELATED votes never create a position on their own (they are attached as
//    context only), because their reasons are ambiguous.
//  * if the coded stance agrees with all direct votes → confidence raised to high;
//  * conflicts (coded stance ≠ implied by a vote) are never auto-resolved: they are
//    listed so a human writes a note or recodes.
//
//   node scripts/reconcile_votes.mjs [--dry]
import { writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, readJSON, stanceFromMajority } from './lib.mjs';

const dry = process.argv.includes('--dry');
const today = new Date().toISOString().slice(0, 10);
const curated = readJSON(join(DATA, 'votes', 'curated.json'));
const derived = readJSON(join(DATA, 'votes', 'derived.json'));
const conflicts = [];
const changes = [];

const dirs = join(DATA, 'positions');
for (const f of readdirSync(dirs).filter((x) => x.endsWith('.json'))) {
  const path = join(dirs, f);
  const doc = readJSON(path);
  const pid = doc.party;
  for (const pos of doc.positions) {
    const votes = curated
      .filter((v) => v.statement === pos.statement)
      .map((v) => {
        const tally = derived.votes[v.id]?.by_party?.[pid];
        const implied = tally ? stanceFromMajority(tally.majority, v.yes_means) : null;
        return { v, implied };
      })
      .filter((x) => x.implied);
    if (!votes.length) continue;

    pos.vote_refs = [...new Set([...(pos.vote_refs || []), ...votes.map((x) => x.v.id)])];
    const direct = votes.filter((x) => x.v.relation === 'direct');
    const related = votes.filter((x) => x.v.relation !== 'direct');
    const uniq = (arr) => [...new Set(arr.map((x) => x.implied))];
    const dImplied = uniq(direct);
    const rImplied = uniq(related);
    const tag = `${pid}:${pos.statement}`;

    if (pos.stance === 'no_clear_position') {
      let basis = null;
      if (direct.length && dImplied.length === 1 && dImplied[0] !== 'neutral') basis = { list: direct, stance: dImplied[0], conf: 'high' };
      if (basis) {
        pos.stance = basis.stance;
        pos.confidence = basis.conf;
        pos.evidence_type = 'vote_xv';
        const searched = (pos.sources || []).filter((s) => s.url);
        pos.sources = [
          ...basis.list.map(({ v }) => ({
            url: v.url_json,
            title: v.title,
            publisher: 'Congreso de los Diputados',
            date: v.date,
            quote: '',
            accessed: today,
          })),
          ...searched.map((s) => ({ ...s, title: s.title || 'Documento consultado' })),
        ];
        const ids = basis.list.map(({ v }) => v.id).join(', ');
        pos.note = `Sin posición explícita en los documentos consultados; codificado a partir del voto del partido en el Congreso (${ids}).`;
        changes.push(`${tag}: no_clear_position → ${basis.stance} (${basis.conf}) from votes`);
      } else if (dImplied.length > 1) {
        conflicts.push(`${tag}: no position, votes are mixed (${votes.map((x) => `${x.v.id}=${x.implied}`).join('; ')})`);
      }
      continue;
    }

    const disagreeing = votes.filter((x) => x.implied !== pos.stance);
    if (disagreeing.length) {
      conflicts.push(
        `${tag}: coded ${pos.stance}/${pos.confidence}${pos.note ? ' (has note)' : ''} vs ${disagreeing.map((x) => `${x.v.id}[${x.v.relation}]=${x.implied}`).join('; ')}`,
      );
    } else if (direct.length && pos.confidence !== 'high') {
      changes.push(`${tag}: confidence ${pos.confidence} → high (consistent direct vote)`);
      pos.confidence = 'high';
    }
  }
  if (!dry) writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
}

console.log(`Changes (${changes.length}):\n  ` + changes.join('\n  '));
console.log(`\nConflicts to review (${conflicts.length}):\n  ` + conflicts.join('\n  '));
