// Result exports, generated entirely in the browser (nothing is uploaded or stored):
//  • the full report (A4 PDF, several pages) to keep: ranking, topic map, every answer
//    and a link that reopens these results without repeating the test;
//  • the summary to share (one page, PDF and PNG): the three closest parties and an
//    invitation to take the test. It does not show the person's answers.
// Layout functions draw on a "page" with the API of pdf.js (PDF page or canvas page).
import { PdfDoc, CanvasPage, wrap, measure, fit } from './pdf.js';
import { drawHemicycle } from './brand.js';

export const SITE_URL = 'https://renzorico.github.io/spanish-elections-2026/';
const C = { ink: '#1c1a17', ink2: '#57524a', ink3: '#8a8378', line: '#e4ddd0', line2: '#d2c9b8', track: '#efe9de', dis: '#b3a894', paper: '#f6f2ea', white: '#ffffff', cell: '#f2ede3' };
const FONT_CSS = { serif: "700 Fraunces, Georgia, serif", serifMed: "500 Fraunces, Georgia, serif", sans: "400 Atkinson, Arial, sans-serif", sansBold: "700 Atkinson, Arial, sans-serif" };
const FONT_FILES = { serif: 'fraunces-700', serifMed: 'fraunces-500', sans: 'atkinson-400', sansBold: 'atkinson-700' };

// ---------- insights (pure; also unit-tested)
/**
 * Neutral, descriptive observations about the result. Only parties with enough data
 * (not limitedData) and a score are used. Never names a "best" party.
 */
export function computeInsights(parties, topics) {
  const ok = parties.filter((p) => !p.limited && p.pct !== null && p.pct !== undefined);
  const out = { spread: null, mostDivergent: null, leastDivergent: null };
  if (ok.length >= 2) {
    const vals = ok.map((p) => Math.round(p.pct * 100));
    out.spread = { max: Math.max(...vals), min: Math.min(...vals), diff: Math.max(...vals) - Math.min(...vals), n: ok.length };
  }
  const ranges = topics
    .map((t) => {
      const v = ok.map((p) => p.topics[t.id]).filter((x) => typeof x === 'number').map((x) => Math.round(x * 100));
      return v.length >= 3 ? { topic: t.id, min: Math.min(...v), max: Math.max(...v), range: Math.max(...v) - Math.min(...v) } : null;
    })
    .filter(Boolean);
  if (ranges.length >= 2) {
    const sorted = [...ranges].sort((a, b) => b.range - a.range);
    if (sorted[0].range > sorted.at(-1).range) {
      out.mostDivergent = sorted[0];
      out.leastDivergent = sorted.at(-1);
    }
  }
  return out;
}

// ---------- fonts
let fontCache = null;
export async function loadPdfFonts(base = 'fonts/pdf/') {
  if (fontCache) return fontCache;
  const metrics = await (await fetch(`${base}metrics.json`)).json();
  const fonts = {};
  await Promise.all(
    Object.entries(FONT_FILES).map(async ([key, file]) => {
      const res = await fetch(`${base}${metrics[file].file}`);
      if (!res.ok) throw new Error(`font ${file}`);
      fonts[key] = { metrics: metrics[file], bytes: new Uint8Array(await res.arrayBuffer()), css: FONT_CSS[key] };
    }),
  );
  fontCache = fonts;
  return fonts;
}

// ---------- shared drawing helpers
function brand(page, x, y, S, { sub = true, color = C.ink } = {}) {
  drawHemicycle(page, x, y, 28, 15.5, color);
  const nw = page.text('29N', x + 34, y + 14.5, { font: 'serif', size: 16, color });
  if (!sub) return;
  const rx = x + 34 + nw + 7;
  page.line(rx, y, rx, y + 17, { color, width: 0.5 });
  page.text(S.brandSub1, rx + 7, y + 7, { font: 'sansBold', size: 5.6, color, tracking: 0.9 });
  page.text(S.brandSub2, rx + 7, y + 14.5, { font: 'sansBold', size: 5.6, color, tracking: 0.9 });
}

function caps(page, str, x, y, opts = {}) {
  page.text(String(str).toLocaleUpperCase(opts.lang || 'es'), x, y, { font: 'sansBold', size: opts.size || 6.4, color: opts.color || C.ink3, tracking: opts.tracking ?? 0.8, align: opts.align || 'left' });
}

function paragraph(page, metrics, str, x, y, width, { font = 'sans', size = 8.5, lead = 1.4, color = C.ink2, maxLines = 99 } = {}) {
  let lines = wrap(metrics[font].metrics, str, size, width);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = fit(metrics[font].metrics, `${lines[maxLines - 1]}…`, size, width);
  }
  lines.forEach((l, i) => page.text(l, x, y + i * size * lead, { font, size, color }));
  return lines.length * size * lead;
}

function mono(page, p, x, y, s) {
  page.rect(x, y, s, s, { fill: C.ink, radius: s * 0.18 });
  const size = p.mono.length > 3 ? s * 0.27 : s * 0.34;
  page.text(p.mono, x + s / 2, y + s / 2 + size * 0.36, { font: 'sansBold', size, color: C.white, align: 'center' });
}

function bar(page, x, y, w, h, v, { limited = false, fill = C.ink } = {}) {
  page.rect(x, y, w, h, { fill: C.track });
  if (v !== null && v !== undefined) page.rect(x, y, Math.max(0.5, w * v), h, { fill: limited ? C.ink3 : fill });
  page.line(x + w / 2, y - 2, x + w / 2, y + h + 2, { color: C.ink3, width: 0.5 });
}

/** Diverging cell: centre = "half and half"; right = agreement, left = disagreement. */
function divCell(page, x, y, w, h, v) {
  if (v === 'skip') {
    page.rect(x, y, w, h, { fill: C.white, stroke: C.line, lineWidth: 0.5, radius: 1.5 });
    page.text('·', x + w / 2, y + h / 2 + 2, { font: 'sans', size: 7, color: C.ink3, align: 'center' });
    return;
  }
  if (v === null || v === undefined) {
    page.rect(x, y, w, h, { fill: C.white, stroke: C.line2, lineWidth: 0.5, radius: 1.5 });
    page.line(x + w * 0.38, y + h / 2, x + w * 0.62, y + h / 2, { color: C.ink3, width: 0.6 });
    return;
  }
  page.rect(x, y, w, h, { fill: C.cell, radius: 1.5 });
  const mid = x + w / 2;
  const d = v - 0.5;
  const bh = h * 0.46;
  const by = y + (h - bh) / 2;
  if (Math.abs(d) < 0.005) page.rect(mid - 1.1, by, 2.2, bh, { fill: C.ink3 });
  else if (d > 0) page.rect(mid, by, (w / 2 - 1) * (d / 0.5), bh, { fill: C.ink });
  else page.rect(mid - (w / 2 - 1) * (-d / 0.5), by, (w / 2 - 1) * (-d / 0.5), bh, { fill: C.dis });
  page.line(mid, y + 1.5, mid, y + h - 1.5, { color: C.ink3, width: 0.4 });
}

function qr(page, q, x, y, size) {
  const m = size / q.size;
  page.rect(x - m * 2, y - m * 2, size + m * 4, size + m * 4, { fill: C.white });
  for (const [cx, cy, run] of q.runs) page.rect(x + cx * m, y + cy * m, run * m + 0.05, m + 0.05, { fill: C.ink });
}

/** Parse the site's static QR SVG (unit squares "Mx yh1v1h-1z") into horizontal runs. */
export function parseQr(svgText) {
  const size = Number(/viewBox="0 0 (\d+) /.exec(svgText)?.[1] || 0);
  const cells = new Set();
  for (const m of svgText.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) cells.add(`${m[1]},${m[2]}`);
  const runs = [];
  for (let yy = 0; yy < size; yy++) {
    let start = -1;
    for (let xx = 0; xx <= size; xx++) {
      const on = cells.has(`${xx},${yy}`);
      if (on && start < 0) start = xx;
      if (!on && start >= 0) {
        runs.push([start, yy, xx - start]);
        start = -1;
      }
    }
  }
  return { size, runs };
}

// ---------- full report (A4)
const A4 = { w: 595.28, h: 841.89, m: 48 };

function header(page, d) {
  brand(page, A4.m, 36, d.S);
  page.text(d.S.reportKind, A4.w - A4.m, 44, { font: 'sansBold', size: 7, color: C.ink2, align: 'right' });
  page.text(d.dateLabel, A4.w - A4.m, 53, { font: 'sans', size: 7, color: C.ink3, align: 'right' });
  page.line(A4.m, 64, A4.w - A4.m, 64, { color: C.ink, width: 1 });
}
function footer(page, d, n, total) {
  const y = A4.h - 34;
  page.line(A4.m, y - 12, A4.w - A4.m, y - 12, { color: C.line2, width: 0.5 });
  page.text(d.siteLabel, A4.m, y, { font: 'sansBold', size: 7, color: C.ink });
  page.link(A4.m, y - 8, 160, 11, d.siteUrl);
  page.text(d.S.notAdvice, A4.m + 168, y, { font: 'sans', size: 7, color: C.ink3 });
  page.text(d.S.pageOf(n, total), A4.w - A4.m, y, { font: 'sans', size: 7, color: C.ink3, align: 'right' });
}

export function layoutReport(doc, d) {
  const F = doc.fonts;
  const W = A4.w - 2 * A4.m;
  const L = A4.m;
  const pages = [];
  const newPage = () => {
    const p = doc.addPage();
    pages.push(p);
    header(p, d);
    return p;
  };
  // ---- page 1: summary
  let p = newPage();
  let y = 100;
  p.text(d.S.reportTitle, L, y, { font: 'serif', size: 25, color: C.ink });
  y += 26;
  const kv = [
    [d.S.kvPlace, d.place],
    [d.S.kvAnswered, d.S.answeredOf(d.answered, d.total)],
    [d.S.kvMore, d.moreTopics.length ? d.moreTopics.join(', ') : d.S.none],
    [d.S.kvLess, d.lessTopics.length ? d.lessTopics.join(', ') : d.S.none],
  ];
  const colW = W / 4;
  kv.forEach(([k, v], i) => {
    caps(p, k, L + i * colW, y, { lang: d.lang });
    paragraph(p, F, v, L + i * colW, y + 11, colW - 10, { font: 'sansBold', size: 8.5, color: C.ink, maxLines: 2 });
  });
  y += 36;
  // insights
  const ins = computeInsights(d.parties, d.topics);
  const topicLabel = (id) => d.topics.find((t) => t.id === id)?.label || id;
  const boxes = [];
  if (ins.spread) boxes.push([d.S.insSpreadBig(ins.spread.diff), d.S.insSpreadText(ins.spread)]);
  if (ins.mostDivergent) boxes.push([topicLabel(ins.mostDivergent.topic), d.S.insMostText(ins.mostDivergent)]);
  if (ins.leastDivergent) boxes.push([topicLabel(ins.leastDivergent.topic), d.S.insLeastText(ins.leastDivergent)]);
  if (boxes.length) {
    p.line(L, y, L + W, y, { color: C.line2, width: 0.5 });
    const bw = W / boxes.length;
    let maxH = 0;
    boxes.forEach(([big, txt], i) => {
      const x = L + i * bw;
      p.text(fit(F.serif.metrics, big, 15, bw - 14), x, y + 24, { font: 'serif', size: 15, color: C.ink });
      maxH = Math.max(maxH, paragraph(p, F, txt, x, y + 38, bw - 16, { size: 8, color: C.ink2, maxLines: 5 }));
    });
    y += 38 + maxH + 6;
    p.line(L, y, L + W, y, { color: C.line2, width: 0.5 });
  }
  y += 26;
  // ranking
  caps(p, d.S.rankTitle, L, y, { lang: d.lang });
  caps(p, d.S.rankOrder, L + W, y, { lang: d.lang, align: 'right' });
  y += 14;
  const cols = { mono: L, name: L + 22, bar: L + 150, barW: 210, pct: L + 410, cov: L + W };
  caps(p, d.S.colParty, cols.name, y, { size: 5.8, lang: d.lang });
  caps(p, d.S.colMatch, cols.bar, y, { size: 5.8, lang: d.lang });
  caps(p, '%', cols.pct, y, { size: 5.8, align: 'right' });
  caps(p, d.S.colCoverage, cols.cov, y, { size: 5.8, align: 'right', lang: d.lang });
  y += 5;
  p.line(L, y, L + W, y, { color: C.ink, width: 0.8 });
  const row = (party) => {
    y += 17;
    mono(p, party, cols.mono, y - 11.5, 14);
    p.text(fit(F.sansBold.metrics, party.name, 8.5, 122), cols.name, y - 1.5, { font: 'sansBold', size: 8.5, color: party.limited ? C.ink2 : C.ink });
    bar(p, cols.bar, y - 8, cols.barW, 6, party.pct, { limited: party.limited });
    p.text(party.pct === null ? '—' : `${Math.round(party.pct * 100)}%`, cols.pct, y - 1, { font: 'serif', size: 10.5, color: C.ink, align: 'right' });
    p.text(d.S.coverageShort(party.withPos, party.answeredCount), cols.cov, y - 1.5, { font: 'sans', size: 7.5, color: C.ink3, align: 'right' });
    p.line(L, y + 4, L + W, y + 4, { color: C.line, width: 0.4 });
  };
  const full = d.parties.filter((x) => !x.limited);
  const lim = d.parties.filter((x) => x.limited);
  full.forEach(row);
  if (lim.length) {
    y += 20;
    caps(p, d.S.limitedGroup, cols.name, y, { size: 5.8, lang: d.lang });
    y += 4;
    p.line(L, y, L + W, y, { color: C.ink, width: 0.5 });
    lim.forEach(row);
    y += 14;
    y += paragraph(p, F, d.S.limitedNote, L, y, W, { size: 7.2, color: C.ink3 });
  }
  // restore box
  y = Math.max(y + 18, 0);
  const boxH = 64;
  if (y + boxH > A4.h - 60) {
    p = newPage();
    y = 90;
  }
  p.rect(L, y, W, boxH, { fill: C.paper, radius: 6 });
  p.text(d.S.restoreTitle, L + 16, y + 22, { font: 'serif', size: 12.5, color: C.ink });
  paragraph(p, F, d.S.restoreText, L + 16, y + 36, W - 190, { size: 7.6, color: C.ink2, maxLines: 3 });
  const bw = 140;
  p.rect(L + W - bw - 16, y + 18, bw, 28, { fill: C.ink, radius: 14 });
  p.text(d.S.restoreButton, L + W - bw / 2 - 16, y + 35.5, { font: 'sansBold', size: 8.6, color: C.white, align: 'center' });
  p.link(L + W - bw - 16, y + 18, bw, 28, d.restoreUrl);
  p.link(L + 16, y + 10, 220, 16, d.restoreUrl);

  // ---- topic map
  p = newPage();
  y = 100;
  p.text(d.S.mapTitle, L, y, { font: 'serif', size: 19, color: C.ink });
  y += 16;
  y += paragraph(p, F, d.S.mapHow, L, y, W, { size: 8.2, color: C.ink2 });
  y += 6;
  const nameW = 84;
  const globW = 34;
  const cw = (W - nameW - globW) / d.topics.length;
  const headBase = y + 62;
  d.topics.forEach((t, i) => {
    const cx = L + nameW + i * cw + cw / 2;
    p.text(t.short, cx - 2, headBase, { font: 'sansBold', size: 7, color: C.ink2, angle: 40 });
    p.rect(cx - 5, headBase + 4, 10, 2, { fill: t.accent });
  });
  caps(p, d.S.colGlobal, L + W, headBase + 1, { size: 5.8, align: 'right', lang: d.lang });
  y = headBase + 12;
  const mapRow = (party) => {
    p.text(fit(F.sansBold.metrics, party.name, 7.8, nameW - 6), L, y + 9.5, { font: 'sansBold', size: 7.8, color: C.ink });
    d.topics.forEach((t, i) => divCell(p, L + nameW + i * cw + 1, y, cw - 2, 13, party.topics[t.id]));
    p.text(party.pct === null ? '—' : `${Math.round(party.pct * 100)}%`, L + W, y + 9.5, { font: 'serif', size: 8.5, color: C.ink, align: 'right' });
    y += 16;
  };
  full.forEach(mapRow);
  if (lim.length) {
    y += 6;
    caps(p, d.S.limitedGroup, L, y + 2, { size: 5.8, lang: d.lang });
    y += 8;
    lim.forEach(mapRow);
  }
  // legend
  y += 10;
  let lx = L;
  const legend = [
    [0.15, d.S.legDis],
    [0.5, d.S.legMid],
    [0.85, d.S.legAgree],
    [null, d.S.legNone],
    ['skip', d.S.legSkip],
  ];
  for (const [v, label] of legend) {
    divCell(p, lx, y, 26, 11, v);
    p.text(label, lx + 31, y + 8, { font: 'sans', size: 7.2, color: C.ink2 });
    lx += 31 + measure(F.sans.metrics, label, 7.2) + 16;
  }
  y += 58;

  // ---- answers, one by one (flows over as many pages as needed)
  const bottom = A4.h - 62;
  const startAnswers = () => {
    p.text(d.S.answersTitle, L, y, { font: 'serif', size: 19, color: C.ink });
    y += 16;
    y += paragraph(p, F, d.S.answersHow, L, y, W, { size: 8.2, color: C.ink2 });
    y += 8;
  };
  if (y > bottom - 140) {
    p = newPage();
    y = 100;
  }
  startAnswers();
  const stW = 300;
  const ansX = L + stW + 20;
  let lastTopic = null;
  for (const a of d.answers) {
    const stLines = wrap(F.sans.metrics, a.text, 8.6, stW);
    const groups = [
      [d.S.favor, a.favor],
      [d.S.against, a.contra],
      [d.S.neutralStance, a.neutral],
      [d.S.noPos, a.none],
    ].filter(([, list]) => list.length);
    const detail = groups.map(([k, list]) => `${k}: ${list.join(', ')}`);
    const detailLines = detail.flatMap((line) => wrap(F.sans.metrics, line, 7, W - 12));
    const h = (lastTopic !== a.topicId ? 18 : 0) + stLines.length * 12 + detailLines.length * 9.4 + 14;
    if (y + h > bottom) {
      p = newPage();
      y = 96;
      lastTopic = null;
    }
    if (lastTopic !== a.topicId) {
      const t = d.topics.find((x) => x.id === a.topicId);
      y += 6;
      p.rect(L, y - 6, 3, 9, { fill: t.accent });
      caps(p, t.label, L + 8, y + 1.6, { color: t.accent, size: 6.6, lang: d.lang });
      y += 12;
      lastTopic = a.topicId;
    }
    stLines.forEach((l, i) => p.text(l, L, y + 9 + i * 12, { font: 'sans', size: 8.6, color: C.ink }));
    caps(p, d.S.you, ansX, y + 4, { size: 5.6, lang: d.lang });
    p.text(a.answer || d.S.skipped, ansX, y + 15, { font: a.answer ? 'sansBold' : 'sans', size: 8.6, color: a.answer ? C.ink : C.ink3 });
    y += stLines.length * 12 + 4;
    detailLines.forEach((l, i) => p.text(l, L, y + 7 + i * 9.4, { font: 'sans', size: 7, color: C.ink2 }));
    y += detailLines.length * 9.4 + 6;
    p.line(L, y, L + W, y, { color: C.line, width: 0.4 });
    y += 4;
  }
  pages.forEach((pg, i) => footer(pg, d, i + 1, pages.length));
  return pages.length;
}

export async function reportPdf(d) {
  const fonts = await loadPdfFonts();
  const doc = new PdfDoc({ fonts, title: d.S.reportTitle });
  layoutReport(doc, d);
  return doc.toBytes();
}

// ---------- summary to share (one page, 4:5)
export const SHARE = { w: 540, h: 675, m: 40 };

export function layoutShare(page, d, fonts) {
  const { w, h, m } = SHARE;
  const W = w - 2 * m;
  page.rect(0, 0, w, h, { fill: C.paper });
  brand(page, m, 34, d.S);
  page.text(d.dateShort, w - m, 47, { font: 'sans', size: 8, color: C.ink3, align: 'right' });
  page.line(m, 62, w - m, 62, { color: C.ink, width: 1 });
  let y = 108;
  const titleLines = wrap(fonts.serif.metrics, d.S.shareTitle, 33, W);
  titleLines.forEach((l, i) => page.text(l, m, y + i * 36, { font: 'serif', size: 33, color: C.ink }));
  y += (titleLines.length - 1) * 36 + 22;
  page.text(d.S.shareSub(d.answered, d.place), m, y, { font: 'sans', size: 9.5, color: C.ink2 });
  y += 30;
  const pool = d.parties.filter((p) => !p.limited && p.pct !== null);
  const top = (pool.length ? pool : d.parties.filter((p) => p.pct !== null)).slice(0, 3);
  top.forEach((party, i) => {
    page.line(m, y, w - m, y, { color: i === 0 ? C.ink : C.line2, width: i === 0 ? 1 : 0.5 });
    const rowY = y + 16;
    page.text(String(i + 1), m, rowY + 30, { font: 'serifMed', size: 30, color: C.ink3 });
    mono(page, party, m + 30, rowY + 2, 38);
    page.text(fit(fonts.serif.metrics, party.name, 20, W - 210), m + 80, rowY + 20, { font: 'serif', size: 20, color: C.ink });
    page.text(d.S.coverageLong(party.withPos, party.answeredCount), m + 80, rowY + 35, { font: 'sans', size: 8, color: C.ink3 });
    page.text(`${Math.round(party.pct * 100)}%`, w - m, rowY + 30, { font: 'serif', size: 32, color: C.ink, align: 'right' });
    bar(page, m + 80, rowY + 46, W - 80, 5, party.pct, { limited: party.limited });
    y += 82;
  });
  page.line(m, y, w - m, y, { color: C.line2, width: 0.5 });
  y += 26;
  if (d.moreTopics.length) {
    caps(page, d.S.shareTopics, m, y, { lang: d.lang, size: 6.8 });
    y += 10;
    let x = m;
    for (const t of d.moreTopicsFull) {
      const tw = measure(fonts.sansBold.metrics, t.label, 9) + 20;
      if (x + tw > w - m) break;
      page.rect(x, y, tw, 20, { fill: t.tint, radius: 10 });
      page.text(t.label, x + 10, y + 13.6, { font: 'sansBold', size: 9, color: t.accent });
      x += tw + 6;
    }
    y += 34;
  }
  // invitation block
  const bh = 122;
  const by = h - m - bh - 20;
  page.rect(m, by, W, bh, { fill: C.ink, radius: 12 });
  const qs = 84;
  page.text(d.S.shareHook, m + 22, by + 36, { font: 'serif', size: 19, color: C.white });
  page.text(d.S.shareHookSub, m + 22, by + 56, { font: 'sans', size: 9, color: '#d9d2c5' });
  page.text(d.siteLabel, m + 22, by + 90, { font: 'sansBold', size: 9.6, color: C.white });
  page.link(m + 22, by + 78, 250, 16, d.siteUrl);
  if (d.qr) qr(page, d.qr, w - m - qs - 22, by + (bh - qs) / 2, qs);
  page.text(d.S.shareFoot, m, h - m + 2, { font: 'sans', size: 7.4, color: C.ink3 });
}

export async function sharePdf(d) {
  const fonts = await loadPdfFonts();
  const doc = new PdfDoc({ width: SHARE.w, height: SHARE.h, fonts, title: d.S.shareTitle });
  layoutShare(doc.addPage(), d, fonts);
  return doc.toBytes();
}

export async function sharePng(d) {
  const fonts = await loadPdfFonts();
  await Promise.all(Object.values(FONT_CSS).map((css) => document.fonts.load(`${css.split(' ')[0]} 20px ${css.split(' ')[1].replace(',', '')}`).catch(() => null)));
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = SHARE.w * scale;
  canvas.height = SHARE.h * scale;
  const page = new CanvasPage(canvas.getContext('2d'), SHARE.w, SHARE.h, fonts, scale);
  layoutShare(page, d, fonts);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
