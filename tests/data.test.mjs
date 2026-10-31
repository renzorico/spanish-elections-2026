import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const t = tallyVote(json, parties, deputyMap, '2025-01-01');
  assert.deepEqual(t.a, { yes: 2, no: 0, abstain: 0, absent: 1, majority: 'yes' });
  assert.deepEqual(t.m, { yes: 0, no: 0, abstain: 1, absent: 0, majority: 'abstain' });
  assert.equal(partyForVote({ diputado: 'Other, Ind', grupo: 'GMx' }, parties, deputyMap, '2025-01-01'), null);
});

test('dated overrides: a deputy counts for their party until the departure date, then as independent', () => {
  const parties = [{ id: 'v', vote_match: { groups: ['GVOX'] } }];
  const map = { 'Smith, Ortega': { party: 'independent', from: '2026-07-17' } };
  const rec = { diputado: 'Smith, Ortega', grupo: 'GVOX', voto: 'No' };
  assert.equal(partyForVote(rec, parties, map, '2023-09-21'), 'v');
  assert.equal(partyForVote(rec, parties, map, '2026-07-16'), 'v');
  assert.equal(partyForVote(rec, parties, map, '2026-07-17'), null);
  assert.throws(() => partyForVote(rec, parties, map), /needs the vote date/);
});

test('real data: Vox is 33, PSOE 121 and Compromís 2 deputies on the 21/09/2023 votes (policy in deputies.json)', () => {
  const d = loadAll();
  const raw = JSON.parse(readFileSync(new URL('../data/votes/raw/v-lenguas-reglamento-2023-09-21.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
  const t = tallyVote(raw, d.parties, d.deputies.deputies, '2023-09-21');
  assert.equal(t.vox.no, 33);
  assert.equal(t.psoe.yes, 121);
  assert.equal(t.compromis.yes, 2);
  assert.equal(t.podemos.yes, 5); // the five Podemos deputies elected on the Sumar list count for Podemos throughout
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

// ---- negative tests: the validator must reject broken evidence (audit F-004) ----
function mutated(fn) {
  const d = structuredClone(loadAll());
  fn(d);
  return validate(d).errors;
}

test('validator rejects a vote_ref that belongs to a different statement', () => {
  const errors = mutated((d) => {
    const pp = d.positions.pp.positions.find((p) => p.statement === 'viv-limite-alquiler');
    pp.vote_refs = ['v-cgpj-vox-2024-02-27'];
  });
  assert.ok(errors.some((e) => /belongs to statement/.test(e)), errors.join('\n'));
});

test('validator rejects a missing derived tally', () => {
  const errors = mutated((d) => {
    d.derived = { votes: {} };
  });
  assert.ok(errors.some((e) => /missing in derived\.json|no derived tally/.test(e)));
});

test('validator rejects a derived tally that does not recompute from the raw Congreso file', () => {
  const errors = mutated((d) => {
    const id = Object.keys(d.derived.votes)[0];
    d.derived.votes[id].by_party.pp.yes += 1;
  });
  assert.ok(errors.some((e) => /does not recompute/.test(e)));
});

test('validator rejects derived metadata that differs from curated.json', () => {
  const errors = mutated((d) => {
    const id = Object.keys(d.derived.votes)[0];
    d.derived.votes[id].yes_means = d.derived.votes[id].yes_means === 'agree' ? 'disagree' : 'agree';
  });
  assert.ok(errors.some((e) => /metadata differs/.test(e)));
});

test('validator enforces the confidence ladder: high needs a direct vote or program text', () => {
  const errors = mutated((d) => {
    const x = d.positions.pp.positions.find((p) => p.stance !== 'no_clear_position' && p.evidence_type === 'program_2023');
    x.evidence_type = 'official_statement';
    x.confidence = 'high';
    x.vote_refs = [];
  });
  assert.ok(errors.some((e) => /high confidence needs/.test(e)));
});

test('validator caps Podemos and Compromís at medium when the joint Sumar program is the only evidence', () => {
  const errors = mutated((d) => {
    const x = d.positions.podemos.positions.find((p) => p.evidence_type === 'program_2023' && p.stance !== 'no_clear_position');
    x.confidence = 'high';
    x.vote_refs = [];
    x.sources = [{ url: 'https://movimientosumar.es/x.pdf', quote: 'q', date: '2023-07-10' }];
  });
  assert.ok(errors.some((e) => /joint Sumar 2023 program/.test(e)));
});

// ---- check_sources: failures must produce a non-ok classification (audit F-005) ----
import { classifyStatus, checkUrls } from '../scripts/check_sources.mjs';

test('classifyStatus separates dead links from access restrictions', () => {
  assert.equal(classifyStatus(200), 'ok');
  assert.equal(classifyStatus(206), 'ok');
  assert.equal(classifyStatus(404), 'failing');
  assert.equal(classifyStatus(410), 'failing');
  assert.equal(classifyStatus(500), 'failing');
  assert.equal(classifyStatus(0), 'failing');
  for (const c of [401, 403, 406, 429]) assert.equal(classifyStatus(c), 'blocked');
});

test('checkUrls: 404 and transport errors fail; unreviewed blocks need review; reviewed blocks pass', async () => {
  const urls = new Map([
    ['https://a.example/ok', ['x']],
    ['https://a.example/dead', ['x']],
    ['https://a.example/down', ['x']],
    ['https://a.example/blocked', ['x']],
    ['https://a.example/reviewed', ['x']],
  ]);
  const codes = { ok: 200, dead: 404, down: 0, blocked: 403, reviewed: 406 };
  const allow = { 'https://a.example/reviewed': { reason: 'bot check', reviewed: '2026-10-31' } };
  const r = await checkUrls(urls, { fetchStatus: async (u) => codes[u.split('/').pop()], allow });
  assert.deepEqual(r.failing.map(([u]) => u.split('/').pop()).sort(), ['dead', 'down']);
  assert.deepEqual(r.needsReview.map(([u]) => u.split('/').pop()), ['blocked']);
  assert.equal(r.results['https://a.example/reviewed'].class, 'blocked_reviewed');
});

test('checkUrls retries a transport error once before failing', async () => {
  let calls = 0;
  const urls = new Map([['https://a.example/flaky', ['x']]]);
  const r = await checkUrls(urls, { fetchStatus: async () => (++calls === 1 ? 0 : 200) });
  assert.equal(r.failing.length, 0);
  assert.equal(calls, 2);
});
