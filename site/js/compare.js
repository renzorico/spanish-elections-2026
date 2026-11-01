// Compare two people's answers (both in the browser; nothing is sent anywhere).
// Agreement on one statement = 1 − |a − b| / 4, with answers from −2 to +2.
// Only statements both people answered count. Pure functions, unit-tested.

const valid = (v) => Number.isInteger(v) && v >= -2 && v <= 2;

export function peerAgreement(statements, topics, a, b) {
  const items = [];
  for (const s of statements) {
    if (!valid(a[s.id]) || !valid(b[s.id])) continue;
    items.push({ statement: s.id, topic: s.topic, a: a[s.id], b: b[s.id], agreement: 1 - Math.abs(a[s.id] - b[s.id]) / 4 });
  }
  const mean = (xs) => (xs.length ? xs.reduce((t, x) => t + x.agreement, 0) / xs.length : null);
  return {
    overall: mean(items),
    n: items.length,
    topics: topics.map((t) => {
      const xs = items.filter((i) => i.topic === t.id);
      return { topic: t.id, agreement: mean(xs), n: xs.length };
    }),
    items,
  };
}
