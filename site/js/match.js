// Matching algorithm — pure functions, no DOM, no network, no storage.
// Shared by the browser app and the Node unit tests (tests/match.test.mjs).
//
// User answers:   -2 (strongly disagree) … +2 (strongly agree), or null/undefined = skipped.
// Party stances:  "agree" (+1) | "neutral" (0) | "disagree" (-1) | "no_clear_position" (missing).
// Agreement for one statement = 1 - |u/2 - p| / 2, in [0, 1]:
//   user +2 vs party agree → 1;  user +1 vs agree → 0.75;  user 0 vs agree → 0.5;
//   user -2 vs agree → 0;        user 0 vs neutral → 1;    user ±2 vs neutral → 0.5.

export const STANCE_VALUE = Object.freeze({ agree: 1, neutral: 0, disagree: -1 });
export const ANSWER_VALUES = Object.freeze([-2, -1, 0, 1, 2]);
export const DEFAULT_WEIGHT = 1;
export const MAX_WEIGHT = 3;
export const LIMITED_DATA_THRESHOLD = 0.5;

export function isValidAnswer(a) {
  return Number.isInteger(a) && a >= -2 && a <= 2;
}

/** Numeric party value, or null when the party has no usable position. */
export function stanceValue(position, { excludeLowConfidence = false } = {}) {
  if (!position) return null;
  const v = STANCE_VALUE[position.stance];
  if (v === undefined) return null; // no_clear_position or unknown
  if (excludeLowConfidence && position.confidence === 'low') return null;
  return v;
}

/** Agreement in [0,1] between a user answer and a party value, or null if not comparable. */
export function statementAgreement(answer, partyValue) {
  if (!isValidAnswer(answer) || partyValue === null || partyValue === undefined) return null;
  return 1 - Math.abs(answer / 2 - partyValue) / 2;
}

function clampWeight(w) {
  if (w === undefined || w === null || Number.isNaN(Number(w))) return DEFAULT_WEIGHT;
  return Math.min(MAX_WEIGHT, Math.max(0, Number(w)));
}

/**
 * Compute per-topic and overall agreement for every party.
 *
 * @param {object} args
 * @param {Array<{id:string, topic:string}>} args.statements
 * @param {Array<{id:string}>} args.topics
 * @param {Array<{id:string}>} args.parties
 * @param {Object<string, Object<string, {stance:string, confidence?:string}>>} args.positions  positions[partyId][statementId]
 * @param {Object<string, number|null>} args.answers  answers[statementId]
 * @param {Object<string, number>} [args.weights]  weights[topicId] in 0..3 (default 1; 0 = ignore topic)
 * @param {{excludeLowConfidence?: boolean}} [args.options]
 * @returns {Array<object>} one result per party, in the SAME order as args.parties (never sorted here).
 */
export function computeMatch({ statements, topics, parties, positions, answers, weights = {}, options = {} }) {
  const answered = statements.filter((s) => isValidAnswer(answers?.[s.id]));

  return parties.map((party) => {
    const partyPositions = positions?.[party.id] || {};
    const perStatement = [];
    const byTopic = new Map(topics.map((t) => [t.id, { sum: 0, n: 0, answered: 0 }]));

    for (const s of answered) {
      const u = answers[s.id];
      const p = stanceValue(partyPositions[s.id], options);
      const a = statementAgreement(u, p);
      perStatement.push({ statement: s.id, topic: s.topic, answer: u, partyValue: p, agreement: a });
      const bucket = byTopic.get(s.topic);
      if (!bucket) continue;
      bucket.answered += 1;
      if (a !== null) {
        bucket.sum += a;
        bucket.n += 1;
      }
    }

    let num = 0;
    let den = 0;
    const topicResults = topics.map((t) => {
      const b = byTopic.get(t.id);
      const weight = clampWeight(weights[t.id]);
      const agreement = b.n > 0 ? b.sum / b.n : null;
      if (b.n > 0 && weight > 0) {
        num += weight * b.sum;
        den += weight * b.n;
      }
      return { topic: t.id, agreement, n: b.n, answered: b.answered, weight };
    });

    // Coverage only counts statements in topics the user has not switched off.
    const counted = perStatement.filter((r) => clampWeight(weights[r.topic]) > 0);
    const withPosition = counted.filter((r) => r.agreement !== null).length;
    const coverageRatio = counted.length > 0 ? withPosition / counted.length : 0;

    return {
      party: party.id,
      overall: den > 0 ? num / den : null,
      coverage: { answered: counted.length, withPosition, ratio: coverageRatio },
      limitedData: counted.length > 0 && coverageRatio < LIMITED_DATA_THRESHOLD,
      topics: topicResults,
      statements: perStatement,
    };
  });
}

/** Optional, user-triggered ordering. Ties and parties without data keep their relative (random) order. */
export function sortByAgreement(results) {
  return results
    .map((r, i) => ({ r, i }))
    .sort((x, y) => {
      const a = x.r.overall;
      const b = y.r.overall;
      if (a === null && b === null) return x.i - y.i;
      if (a === null) return 1;
      if (b === null) return -1;
      return b - a || x.i - y.i;
    })
    .map(({ r }) => r);
}

/** Unbiased Fisher–Yates shuffle. `random` returns a float in [0,1); injectable for tests. */
export function shuffle(array, random = Math.random) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Cryptographically strong [0,1) source when available (browser / Node ≥ 19). */
export function cryptoRandom() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0] / 2 ** 32;
  }
  return Math.random();
}
