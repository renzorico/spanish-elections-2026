import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = join(ROOT, 'data');

export function readJSON(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing file: ${path}`);
  }
  // Congreso files come with a UTF-8 BOM.
  return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
}

export function loadAll() {
  const parties = readJSON(join(DATA, 'parties.json'));
  const topics = readJSON(join(DATA, 'topics.json'));
  const statements = readJSON(join(DATA, 'statements.json'));
  const positions = {};
  const posDir = join(DATA, 'positions');
  if (existsSync(posDir)) {
    for (const f of readdirSync(posDir).filter((f) => f.endsWith('.json'))) {
      const doc = readJSON(join(posDir, f));
      positions[doc.party] = doc;
    }
  }
  const curated = readJSON(join(DATA, 'votes', 'curated.json'), []);
  const derived = readJSON(join(DATA, 'votes', 'derived.json'), { votes: {} });
  const deputies = readJSON(join(DATA, 'votes', 'deputies.json'), { deputies: {} });
  const provincesDoc = readJSON(join(DATA, 'provinces.json'), { provinces: [] });
  const candidacies = readJSON(join(DATA, 'candidacies.json'), null);
  return { parties, topics, statements, positions, curated, derived, deputies, provincesDoc, candidacies };
}

/** Which party does a single deputy vote belong to? Returns party id or null. */
export function partyForVote(record, parties, deputyMap) {
  const override = deputyMap[record.diputado];
  if (override) {
    const p = parties.find((x) => x.id === override.party);
    return p ? p.id : null; // e.g. 'upn' or 'independent' are not included parties
  }
  for (const p of parties) {
    const vm = p.vote_match || {};
    if ((vm.exclude_deputies || []).includes(record.diputado)) continue;
    if ((vm.deputies || []).includes(record.diputado)) return p.id;
    if ((vm.groups || []).includes(record.grupo)) return p.id;
  }
  return null;
}

export function tallyVote(voteJson, parties, deputyMap) {
  const out = {};
  for (const p of parties) out[p.id] = { yes: 0, no: 0, abstain: 0, absent: 0 };
  for (const r of voteJson.votaciones || []) {
    const pid = partyForVote(r, parties, deputyMap);
    if (!pid) continue;
    const t = out[pid];
    if (r.voto === 'Sí') t.yes++;
    else if (r.voto === 'No') t.no++;
    else if (r.voto === 'Abstención') t.abstain++;
    else t.absent++;
  }
  for (const t of Object.values(out)) t.majority = majorityOf(t);
  return out;
}

export function majorityOf({ yes, no, abstain }) {
  const voted = yes + no + abstain;
  if (voted === 0) return 'absent';
  const top = Math.max(yes, no, abstain);
  if (top * 2 <= voted) return 'split';
  return top === yes ? 'yes' : top === no ? 'no' : 'abstain';
}

/** Stance implied by a vote majority, given what a "yes" means for the statement. */
export function stanceFromMajority(majority, yesMeans) {
  if (majority === 'yes') return yesMeans;
  if (majority === 'no') return yesMeans === 'agree' ? 'disagree' : 'agree';
  if (majority === 'abstain') return 'neutral';
  return null;
}
