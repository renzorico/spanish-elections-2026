// "Return to my results" link. The answers, topic weights and constituency are packed
// into the URL fragment (#r=…). A fragment is never sent to the server, and the app
// writes nothing to browser storage: the link exists only where the user keeps it
// (the full PDF report). Pure functions, shared with the unit tests.

const ANSWER_CHARS = 'abcde'; // -2 … +2
const SKIP = '_';
const WEIGHT_CHARS = { 0.5: 'l', 1: 's', 2: 'm' };
const WEIGHT_VALUES = { l: 0.5, s: 1, m: 2 };
export const RESTORE_VERSION = '1';

/**
 * Encode state into the fragment payload (without the leading '#r=').
 * `stamp` (YYYY-MM-DD, optional) is the data date, so a reopened link can say what changed since.
 */
export function encodeRestore({ statements, topics, answers, weights, province, stamp }) {
  const a = statements.map((s) => {
    const v = answers[s.id];
    return Number.isInteger(v) && v >= -2 && v <= 2 ? ANSWER_CHARS[v + 2] : SKIP;
  });
  const w = topics.map((t) => WEIGHT_CHARS[weights[t.id]] || 's');
  const parts = [RESTORE_VERSION, a.join(''), w.join(''), encodeURIComponent(province || '')];
  if (stamp && /^\d{4}-\d{2}-\d{2}$/.test(stamp)) parts.push(stamp.replace(/-/g, ''));
  return parts.join('.');
}

/** Decode a payload. Returns null if it does not match the current questionnaire. */
export function decodeRestore(payload, { statements, topics, provinces }) {
  if (typeof payload !== 'string') return null;
  const [ver, a, w, prov = '', st = ''] = payload.split('.');
  if (ver !== RESTORE_VERSION || !a || !w) return null;
  if (a.length !== statements.length || w.length !== topics.length) return null;
  if (!/^[a-e_]+$/.test(a) || !/^[lsm]+$/.test(w)) return null;
  const answers = {};
  statements.forEach((s, i) => {
    const c = a[i];
    answers[s.id] = c === SKIP ? null : ANSWER_CHARS.indexOf(c) - 2;
  });
  const weights = {};
  topics.forEach((t, i) => {
    weights[t.id] = WEIGHT_VALUES[w[i]];
  });
  let province = '';
  try {
    province = decodeURIComponent(prov);
  } catch {
    province = '';
  }
  if (province && !provinces.some((p) => p.id === province)) province = '';
  const stamp = /^\d{8}$/.test(st) ? `${st.slice(0, 4)}-${st.slice(4, 6)}-${st.slice(6)}` : null;
  return { answers, weights, province, stamp };
}

// "Compare with someone" link: #c=<payload>~<optional first name>. The name is whatever the
// person typed (max 24 characters) and is only shown to whoever opens the link.
export function encodeCompare(args, name = '') {
  const n = String(name || '').trim().slice(0, 24);
  return encodeRestore({ ...args, province: '', stamp: null }) + (n ? `~${encodeURIComponent(n)}` : '');
}
export function decodeCompare(payload, data) {
  if (typeof payload !== 'string') return null;
  const [body, rawName = ''] = payload.split('~');
  const r = decodeRestore(body, data);
  if (!r) return null;
  let name = '';
  try {
    name = decodeURIComponent(rawName).replace(/[<>]/g, '').trim().slice(0, 24);
  } catch {
    name = '';
  }
  return { answers: r.answers, name };
}
