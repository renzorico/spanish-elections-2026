import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  statementAgreement,
  stanceValue,
  computeMatch,
  sortByAgreement,
  shuffle,
  cryptoRandom,
} from '../site/js/match.js';

const topics = [{ id: 'a' }, { id: 'b' }];
const statements = [
  { id: 's1', topic: 'a' },
  { id: 's2', topic: 'a' },
  { id: 's3', topic: 'b' },
];
const parties = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
const positions = {
  x: { s1: { stance: 'agree', confidence: 'high' }, s2: { stance: 'agree', confidence: 'high' }, s3: { stance: 'disagree', confidence: 'high' } },
  y: { s1: { stance: 'disagree', confidence: 'high' }, s2: { stance: 'no_clear_position' }, s3: { stance: 'agree', confidence: 'low' } },
  z: {},
};

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);

test('statementAgreement covers the full scale', () => {
  assert.equal(statementAgreement(2, 1), 1);
  assert.equal(statementAgreement(1, 1), 0.75);
  assert.equal(statementAgreement(0, 1), 0.5);
  assert.equal(statementAgreement(-1, 1), 0.25);
  assert.equal(statementAgreement(-2, 1), 0);
  assert.equal(statementAgreement(0, 0), 1);
  assert.equal(statementAgreement(2, 0), 0.5);
  assert.equal(statementAgreement(-2, -1), 1);
});

test('statementAgreement is symmetric under sign flip', () => {
  for (const u of [-2, -1, 0, 1, 2]) for (const p of [-1, 0, 1]) assert.equal(statementAgreement(u, p), statementAgreement(-u, -p));
});

test('statementAgreement returns null for skipped answers or missing positions', () => {
  assert.equal(statementAgreement(null, 1), null);
  assert.equal(statementAgreement(undefined, 1), null);
  assert.equal(statementAgreement(3, 1), null);
  assert.equal(statementAgreement(1.5, 1), null);
  assert.equal(statementAgreement(1, null), null);
});

test('stanceValue treats no_clear_position as missing and can drop low confidence', () => {
  assert.equal(stanceValue({ stance: 'no_clear_position' }), null);
  assert.equal(stanceValue(undefined), null);
  assert.equal(stanceValue({ stance: 'agree', confidence: 'low' }), 1);
  assert.equal(stanceValue({ stance: 'agree', confidence: 'low' }, { excludeLowConfidence: true }), null);
  assert.equal(stanceValue({ stance: 'neutral', confidence: 'medium' }, { excludeLowConfidence: true }), 0);
});

test('computeMatch: per-topic breakdown and overall', () => {
  const answers = { s1: 2, s2: 1, s3: -2 };
  const [x, y, z] = computeMatch({ statements, topics, parties, positions, answers });
  // x: s1 1, s2 0.75 → topic a = 0.875; s3 user -2 vs disagree → 1 → topic b = 1; overall (1+0.75+1)/3
  close(x.topics[0].agreement, 0.875);
  close(x.topics[1].agreement, 1);
  close(x.overall, 2.75 / 3);
  assert.deepEqual(x.coverage, { answered: 3, withPosition: 3, ratio: 1 });
  assert.equal(x.limitedData, false);
  // y: s1 user 2 vs disagree → 0; s2 missing; s3 -2 vs agree → 0
  close(y.topics[0].agreement, 0);
  assert.equal(y.topics[0].n, 1);
  assert.equal(y.topics[0].answered, 2);
  close(y.overall, 0);
  // z: nothing coded → no score, flagged
  assert.equal(z.overall, null);
  assert.equal(z.limitedData, true);
  assert.equal(z.topics[0].agreement, null);
});

test('computeMatch: missing positions are never imputed (do not drag score toward 0.5)', () => {
  const answers = { s1: 2, s2: 2 };
  const [, y] = computeMatch({ statements, topics, parties, positions, answers });
  assert.equal(y.overall, 0); // only s1 counts, not (0 + 0.5)/2
  assert.equal(y.coverage.withPosition, 1);
  assert.equal(y.coverage.ratio, 0.5);
  assert.equal(y.limitedData, false); // exactly 50% is not below threshold
});

test('computeMatch: topic weights change the overall but not per-topic scores', () => {
  const answers = { s1: 2, s2: 2, s3: 2 };
  const base = computeMatch({ statements, topics, parties, positions, answers })[0];
  // x: a = 1 (2 stmts), b = 0 (1 stmt) → overall 2/3
  close(base.overall, 2 / 3);
  const heavyB = computeMatch({ statements, topics, parties, positions, answers, weights: { b: 3 } })[0];
  close(heavyB.overall, (1 * 2 + 3 * 0) / (1 * 2 + 3 * 1)); // 0.4
  close(heavyB.topics[0].agreement, base.topics[0].agreement);
  const noB = computeMatch({ statements, topics, parties, positions, answers, weights: { b: 0 } })[0];
  close(noB.overall, 1);
  assert.equal(noB.coverage.answered, 2); // switched-off topic excluded from coverage
});

test('computeMatch: weights are clamped to 0..3', () => {
  const answers = { s1: 2, s3: 2 };
  const r1 = computeMatch({ statements, topics, parties, positions, answers, weights: { b: 99 } })[0];
  const r2 = computeMatch({ statements, topics, parties, positions, answers, weights: { b: 3 } })[0];
  close(r1.overall, r2.overall);
  const r3 = computeMatch({ statements, topics, parties, positions, answers, weights: { b: -5 } })[0];
  close(r3.overall, 1);
});

test('computeMatch: excludeLowConfidence removes low-confidence positions', () => {
  const answers = { s1: -2, s3: 2 };
  const [, yAll] = computeMatch({ statements, topics, parties, positions, answers });
  close(yAll.overall, 1);
  const [, yStrict] = computeMatch({ statements, topics, parties, positions, answers, options: { excludeLowConfidence: true } });
  assert.equal(yStrict.coverage.withPosition, 1);
  assert.equal(yStrict.topics[1].agreement, null);
});

test('computeMatch: no answers → no scores, no crash', () => {
  const res = computeMatch({ statements, topics, parties, positions, answers: {} });
  for (const r of res) {
    assert.equal(r.overall, null);
    assert.equal(r.limitedData, false);
    assert.equal(r.coverage.answered, 0);
  }
});

test('computeMatch preserves input party order (no implicit ranking)', () => {
  const answers = { s1: -2, s2: -2, s3: 2 };
  const order = [{ id: 'z' }, { id: 'x' }, { id: 'y' }];
  const res = computeMatch({ statements, topics, parties: order, positions, answers });
  assert.deepEqual(res.map((r) => r.party), ['z', 'x', 'y']);
});

test('identical positions get identical scores regardless of party id or order', () => {
  const same = { stance: 'agree', confidence: 'high' };
  const pos = { p1: { s1: same }, p2: { s1: same } };
  const res = computeMatch({ statements, topics, parties: [{ id: 'p2' }, { id: 'p1' }], positions: pos, answers: { s1: 1 } });
  assert.equal(res[0].overall, res[1].overall);
});

test('sortByAgreement puts null last and is stable for ties', () => {
  const sorted = sortByAgreement([
    { party: 'a', overall: null },
    { party: 'b', overall: 0.5 },
    { party: 'c', overall: 0.9 },
    { party: 'd', overall: 0.5 },
  ]);
  assert.deepEqual(sorted.map((r) => r.party), ['c', 'b', 'd', 'a']);
});

test('shuffle is a permutation and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5, 6];
  const out = shuffle(input, cryptoRandom);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5, 6]);
});

test('shuffle is approximately uniform over positions', () => {
  const N = 30000;
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) counts[shuffle(['a', 'b', 'c', 'd'], cryptoRandom).indexOf('a')]++;
  for (const c of counts) assert.ok(Math.abs(c / N - 0.25) < 0.02, `position frequency ${c / N}`);
});
