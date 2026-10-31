// The 29N mark: the Congress chamber drawn as rows of seats, all in one tone.
// Used by the header SVG (pre-rendered), the favicon and the PDF/PNG exports.

/** Dot centres for a hemicycle that fits a w×h box (h ≈ w/2). Returns {dots:[[x,y]], r}. */
export function hemicycle(w, h, rows = 3) {
  const counts = rows >= 5 ? [9, 12, 15, 18, 21] : rows === 4 ? [7, 10, 13, 16] : [6, 9, 12];
  const r = h * (rows >= 5 ? 0.06 : rows === 4 ? 0.072 : 0.112);
  const cx = w / 2;
  const cy = h - r - 0.02 * h;
  const R = Math.min(w / 2, h) - r - 0.02 * h;
  const r0 = R * 0.42;
  const dots = [];
  counts.forEach((n, i) => {
    const rr = r0 + ((R - r0) * i) / (counts.length - 1);
    for (let k = 0; k < n; k++) {
      const a = Math.PI - (Math.PI * k) / (n - 1);
      dots.push([cx + rr * Math.cos(a), cy - rr * Math.sin(a)]);
    }
  });
  return { dots, r };
}

/** Standalone SVG markup for the mark (currentColor unless a colour is given). */
export function hemicycleSvg(w, h, rows = 3, color = 'currentColor') {
  const { dots, r } = hemicycle(w, h, rows);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${dots
    .map(([x, y]) => `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="${color}"/>`)
    .join('')}</svg>`;
}

/** Draw the mark on a painter (PDF page or canvas page). */
export function drawHemicycle(page, x, y, w, h, color, rows = 3) {
  const { dots, r } = hemicycle(w, h, rows);
  for (const [dx, dy] of dots) page.circle(x + dx, y + dy, r, { fill: color });
}
