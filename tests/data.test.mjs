import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll, tallyVote, majorityOf, stanceFromMajority, partyForVote } from '../scripts/lib.mjs';
import { validate, findLoadedTerms } from '../scripts/validate.mjs';

test('majorityOf', () => {
  assert.equal(majorityOf({ yes: 3, no: 1, abstain: 0 }), 'yes');
  assert.equal(majorityOf({ yes: 1, no: 1, abstain: 0 }), 'split');
  assert.equal(majorityOf({ yes: 0, no: 0, abstain: 0 }), 'absent');
  assert.equal(majorityOf({ yes: 0, no: 0, abstain: 2 }), 'abstain');
});

test('stanceFromMajority respects yes_means', () => {
  assert.equal(stanceFromMajority('yes', 'agree'), 'agree');
  assert.equal(stanceFromMajority('no', 'agree'), 'disagree');
  assert.equal(stanceFromMajority('yes', 'disagree'), 'disagree');
  assert.equal(stanceFromMajority('no', 'disagree'), 'agree');
  assert.equal(stanceFromMajority('abstain', 'agree'), 'neutral');
  assert.equal(stanceFromMajority('split', 'agree'), null);
});

test('tallyVote attributes Mixed Group deputies via the deputy map and excludes leavers', () => {
  const parties = [
    { id: 'a', vote_match: { groups: ['GA'], exclude_deputies: ['Leaver, X'] } },
    { id: 'm', vote_match: { groups: [] } },
  ];
  const deputyMap = { 'Mixto, Uno': { party: 'm' }, 'Other, Ind': { party: 'independent' } };
  const json = {
    votaciones: [
      { diputado: 'A, 1', grupo: 'GA', voto: 'Sí' },
      { diputado: 'A, 2', grupo: 'GA', voto: 'Sí' },
      { diputado: 'Leaver, X', grupo: 'GA', voto: 'No' },
      { diputado: 'Mixto, Uno', grupo: 'GMx', voto: 'Abstención' },
      { diputado: 'Other, Ind', grupo: 'GMx', voto: 'No' },
      { diputado: 'A, 3', grupo: 'GA', voto: 'No vota' },
    ],
  };
  const t = tallyVote(json, parties, deputyMap);
  assert.deepEqual(t.a, { yes: 2, no: 0, abstain: 0, absent: 1, majority: 'yes' });
  assert.deepEqual(t.m, { yes: 0, no: 0, abstain: 1, absent: 0, majority: 'abstain' });
  assert.equal(partyForVote({ diputado: 'Other, Ind', grupo: 'GMx' }, parties, deputyMap), null);
});

test('loaded-term lint catches charged words, accent-insensitive', () => {
  assert.deepEqual(findLoadedTerms('Los okupas y la inmigración ilegal'), ['okupa', 'ilegal']);
  assert.deepEqual(findLoadedTerms('Adoctrinamiento en las aulas'), ['adoctrinamiento']);
  assert.deepEqual(findLoadedTerms('Debería limitarse el alquiler en zonas tensionadas.'), []);
});

test('repository data passes validation', () => {
  const { errors } = validate(loadAll());
  assert.deepEqual(errors, []);
});

test('every included party has a positions file covering all statements', () => {
  const d = loadAll();
  for (const p of d.parties) {
    const doc = d.positions[p.id];
    assert.ok(doc, `missing positions for ${p.id}`);
    assert.equal(doc.positions.length, d.statements.length, `${p.id} statement count`);
  }
});

test('topics are balanced: 2–5 statements each', () => {
  const d = loadAll();
  for (const t of d.topics) {
    const n = d.statements.filter((s) => s.topic === t.id).length;
    assert.ok(n >= 2 && n <= 5, `${t.id} has ${n}`);
  }
});

test('acquiescence check: answering "strongly agree" (or disagree) to everything gives no well-documented party an extreme score', async () => {
  const { computeMatch } = await import('../site/js/match.js');
  const d = loadAll();
  const positions = Object.fromEntries(
    Object.entries(d.positions).map(([pid, doc]) => [pid, Object.fromEntries(doc.positions.map((p) => [p.statement, p]))]),
  );
  for (const v of [2, -2]) {
    const answers = Object.fromEntries(d.statements.map((s) => [s.id, v]));
    for (const r of computeMatch({ statements: d.statements, topics: d.topics, parties: d.parties, positions, answers })) {
      if (r.limitedData) continue;
      assert.ok(r.overall >= 0.3 && r.overall <= 0.7, `${r.party} scores ${r.overall} when answering ${v} to everything`);
    }
  }
});
