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

// ---------- full report (A4, three pages)
//  1  Summary: title, key facts, neutral observations, ranking, return link
//  2  By topic: topic map and how far apart the parties are on each topic
//  3  Your answers: one grid, statements down, parties across (continues only if needed)
// Type rules: serif for titles and numbers, regular sans for text, bold only for the tiny
// caps labels. Nothing is ever truncated with an ellipsis except party names in a column.
const A4 = { w: 595.28, h: 841.89, m: 48 };
const BOTTOM = A4.h - 62; // lowest y for content (footer sits below)

function header(page, d) {
  brand(page, A4.m, 36, d.S);
  page.text(d.S.reportKind, A4.w - A4.m, 44, { font: 'sansBold', size: 6.6, color: C.ink2, align: 'right', tracking: 0.8 });
  page.text(d.dateLabel, A4.w - A4.m, 54, { font: 'sans', size: 7.4, color: C.ink3, align: 'right' });
  page.line(A4.m, 64, A4.w - A4.m, 64, { color: C.ink, width: 1 });
}
function footer(page, d, n, total) {
  const y = A4.h - 34;
  page.line(A4.m, y - 12, A4.w - A4.m, y - 12, { color: C.line2, width: 0.5 });
  const w = page.text(d.siteLabel, A4.m, y, { font: 'sans', size: 7.4, color: C.ink });
  page.link(A4.m, y - 8, w, 11, d.siteUrl);
  page.text(d.S.notAdvice, A4.m + w + 14, y, { font: 'sans', size: 7.4, color: C.ink3 });
  page.text(d.S.pageOf(n, total), A4.w - A4.m, y, { font: 'sans', size: 7.4, color: C.ink3, align: 'right' });
}
/** Section opener: small numbered caps label + serif title. Returns the next y. */
function sectionHead(page, d, y, num, label, title, size = 21) {
  caps(page, `${num}  ·  ${label}`, A4.m, y, { lang: d.lang, size: 6.6 });
  page.text(title, A4.m, y + size + 4, { font: 'serif', size, color: C.ink });
  return y + size + 4;
}
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => `#${hex2(a).map((v, i) => Math.round(v + (hex2(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
/** Fill for "how close is this party to you on this statement" (0 light … 1 dark). */
const shade = (a) => mixHex('#efe9de', '#1c1a17', Math.max(0, Math.min(1, a)));
const USER_SYM = { '-2': '––', '-1': '–', 0: '0', 1: '+', 2: '++' };
const STANCE_SYM = { agree: '+', neutral: '0', disagree: '–' };

/** Per-topic spread between parties with enough data (pure; unit-tested). */
export function topicRanges(parties, topics) {
  const ok = parties.filter((p) => !p.limited && p.pct !== null && p.pct !== undefined);
  return topics.map((t) => {
    const v = ok.map((p) => p.topics[t.id]).filter((x) => typeof x === 'number').map((x) => Math.round(x * 100));
    return v.length >= 2 ? { topic: t.id, min: Math.min(...v), max: Math.max(...v) } : { topic: t.id, min: null, max: null };
  });
}

export function layoutReport(doc, d) {
  const F = doc.fonts;
  const L = A4.m;
  const W = A4.w - 2 * A4.m;
  const pages = [];
  const newPage = () => {
    const p = doc.addPage();
    pages.push(p);
    header(p, d);
    return p;
  };
  const full = d.parties.filter((x) => !x.limited);
  const lim = d.parties.filter((x) => x.limited);

  // ================= page 1: summary
  let p = newPage();
  let y = 96;
  caps(p, d.S.kicker, L, y, { lang: d.lang, size: 6.8 });
  y += 8;
  for (const line of wrap(F.serif.metrics, d.S.reportTitle, 30, W)) {
    y += 30;
    p.text(line, L, y, { font: 'serif', size: 30, color: C.ink });
  }
  y += 28;
  // key facts: label above, plain value below (values wrap, never cut)
  const kv = [
    [d.S.kvPlace, d.place],
    [d.S.kvAnswered, d.S.answeredOf(d.answered, d.total)],
    [d.S.kvMore, d.moreTopics.length ? d.moreTopics.join(', ') : d.S.none],
    [d.S.kvLess, d.lessTopics.length ? d.lessTopics.join(', ') : d.S.none],
  ];
  const kw = W / 4;
  let kh = 0;
  kv.forEach(([k, v], i) => {
    caps(p, k, L + i * kw, y, { lang: d.lang, size: 6.2 });
    kh = Math.max(kh, paragraph(p, F, v, L + i * kw, y + 12, kw - 12, { size: 9, color: C.ink, lead: 1.35 }));
  });
  y += 12 + kh + 4;
  p.line(L, y, L + W, y, { color: C.line2, width: 0.5 });
  y += 24;
  // neutral observations
  const ins = computeInsights(d.parties, d.topics);
  const topicLabel = (id) => d.topics.find((t) => t.id === id)?.label || id;
  const boxes = [];
  if (ins.spread) boxes.push([d.S.insSpreadBig(ins.spread.diff), d.S.insSpreadText(ins.spread)]);
  if (ins.mostDivergent) boxes.push([topicLabel(ins.mostDivergent.topic), d.S.insMostText(ins.mostDivergent)]);
  if (ins.leastDivergent) boxes.push([topicLabel(ins.leastDivergent.topic), d.S.insLeastText(ins.leastDivergent)]);
  if (boxes.length) {
    caps(p, d.S.insTitle, L, y - 8, { lang: d.lang, size: 6.2 });
    y += 10;
    const bw = W / boxes.length;
    let bh = 0;
    boxes.forEach(([big, txt], i) => {
      const x = L + i * bw;
      const bigLines = wrap(F.serif.metrics, big, 14, bw - 16);
      bigLines.forEach((l, k) => p.text(l, x, y + 12 + k * 15, { font: 'serif', size: 14, color: C.ink }));
      const off = 12 + (bigLines.length - 1) * 15 + 14;
      bh = Math.max(bh, off + paragraph(p, F, txt, x, y + off, bw - 18, { size: 8.2, color: C.ink2, lead: 1.4 }));
    });
    y += bh + 12;
    p.line(L, y, L + W, y, { color: C.line2, width: 0.5 });
    y += 26;
  }
  // ranking
  caps(p, d.S.rankTitle, L, y, { lang: d.lang, size: 6.6 });
  caps(p, d.S.rankOrder, L + W, y, { lang: d.lang, size: 6.2, align: 'right' });
  y += 14;
  const cols = { mono: L, name: L + 24, bar: L + 140, barW: 215, pct: L + 410, cov: L + W };
  caps(p, d.S.colParty, cols.name, y, { size: 5.8, lang: d.lang });
  caps(p, d.S.colMatch, cols.bar, y, { size: 5.8, lang: d.lang });
  caps(p, d.S.colCoverage, cols.cov, y, { size: 5.8, align: 'right', lang: d.lang });
  y += 5;
  p.line(L, y, L + W, y, { color: C.ink, width: 0.8 });
  const row = (party) => {
    y += 19;
    mono(p, party, cols.mono, y - 12.5, 15);
    p.text(fit(F.sans.metrics, party.name, 9.2, 108), cols.name, y - 2, { font: 'sans', size: 9.2, color: party.limited ? C.ink2 : C.ink });
    bar(p, cols.bar, y - 8.5, cols.barW, 6, party.pct, { limited: party.limited });
    p.text(party.pct === null ? '—' : `${Math.round(party.pct * 100)}%`, cols.pct, y - 1, { font: 'serif', size: 11.5, color: C.ink, align: 'right' });
    p.text(d.S.coverageShort(party.withPos, party.answeredCount), cols.cov, y - 2, { font: 'sans', size: 7.6, color: C.ink3, align: 'right' });
    p.line(L, y + 5, L + W, y + 5, { color: C.line, width: 0.4 });
  };
  full.forEach(row);
  if (lim.length) {
    y += 24;
    caps(p, d.S.limitedGroup, cols.name, y, { size: 5.8, lang: d.lang });
    y += 4;
    p.line(L, y, L + W, y, { color: C.ink, width: 0.5 });
    lim.forEach(row);
    y += 18;
    y += paragraph(p, F, d.S.limitedNote, L, y, W, { size: 7.6, color: C.ink3, lead: 1.4 });
  }
  // return-to-results box: sits at the foot of the page
  const boxH = 66;
  y = Math.max(y + 22, BOTTOM - boxH - 4);
  if (y + boxH > BOTTOM) {
    p = newPage();
    y = 96;
  }
  p.rect(L, y, W, boxH, { fill: C.paper, radius: 6 });
  p.text(d.S.restoreTitle, L + 16, y + 24, { font: 'serif', size: 13, color: C.ink });
  paragraph(p, F, d.S.restoreText, L + 16, y + 39, W - 190, { size: 7.8, color: C.ink2, lead: 1.4 });
  const bw = 140;
  p.rect(L + W - bw - 16, y + 19, bw, 28, { fill: C.ink, radius: 14 });
  p.text(d.S.restoreButton, L + W - bw / 2 - 16, y + 36.5, { font: 'sansBold', size: 8.4, color: C.white, align: 'center' });
  p.link(L + W - bw - 16, y + 19, bw, 28, d.restoreUrl);

  // ================= page 2: by topic
  p = newPage();
  y = 96;
  y = sectionHead(p, d, y, '02', d.S.sec2, d.S.mapTitle);
  y += 16;
  y += paragraph(p, F, d.S.mapHow, L, y, W - 40, { size: 8.4, color: C.ink2, lead: 1.45 });
  y += 8;
  const nameW = 88;
  const globW = 34;
  const cw = (W - nameW - globW) / d.topics.length;
  const headBase = y + 50;
  d.topics.forEach((t, i) => {
    const cx = L + nameW + i * cw + cw / 2;
    p.text(t.short, cx - 2, headBase, { font: 'sans', size: 7.2, color: C.ink2, angle: 40 });
    p.rect(cx - 5, headBase + 5, 10, 2, { fill: t.accent });
  });
  caps(p, d.S.colGlobal, L + W, headBase + 3, { size: 5.8, align: 'right', lang: d.lang });
  y = headBase + 14;
  const mapRow = (party) => {
    p.text(fit(F.sans.metrics, party.name, 8.2, nameW - 8), L, y + 9.6, { font: 'sans', size: 8.2, color: C.ink });
    d.topics.forEach((t, i) => divCell(p, L + nameW + i * cw + 1, y, cw - 2, 13, party.topics[t.id]));
    p.text(party.pct === null ? '—' : `${Math.round(party.pct * 100)}%`, L + W, y + 10, { font: 'serif', size: 9, color: C.ink, align: 'right' });
    y += 17;
  };
  full.forEach(mapRow);
  if (lim.length) {
    y += 7;
    caps(p, d.S.limitedGroup, L, y + 2, { size: 5.8, lang: d.lang });
    y += 9;
    lim.forEach(mapRow);
  }
  y += 10;
  let lx = L;
  for (const [v, label] of [[0.15, d.S.legDis], [0.5, d.S.legMid], [0.85, d.S.legAgree], [null, d.S.legNone], ['skip', d.S.legSkip]]) {
    divCell(p, lx, y, 26, 11, v);
    p.text(label, lx + 31, y + 8, { font: 'sans', size: 7.2, color: C.ink2 });
    lx += 31 + measure(F.sans.metrics, label, 7.2) + 14;
  }
  // spread per topic
  y += 44;
  caps(p, d.S.spreadTitle, L, y, { lang: d.lang, size: 6.6 });
  y += 14;
  y += paragraph(p, F, d.S.spreadHow, L, y, W - 40, { size: 8.4, color: C.ink2, lead: 1.45 });
  y += 8;
  const tc = { topic: L + 14, weight: L + 188, answered: L + 250, bar: L + 322, barW: 130 };
  caps(p, d.S.colTopic, tc.topic, y, { size: 5.8, lang: d.lang });
  caps(p, d.S.colWeight, tc.weight, y, { size: 5.8, lang: d.lang });
  caps(p, d.S.colAnswered, tc.answered, y, { size: 5.8, lang: d.lang });
  caps(p, d.S.colSpread, tc.bar, y, { size: 5.8, lang: d.lang });
  y += 5;
  p.line(L, y, L + W, y, { color: C.ink, width: 0.8 });
  const ranges = topicRanges(d.parties, d.topics);
  d.topics.forEach((t, i) => {
    y += 19;
    p.rect(L, y - 9, 3, 11, { fill: t.accent });
    p.text(t.label, tc.topic, y - 1, { font: 'sans', size: 8.6, color: C.ink });
    const wgt = d.topicWeights[t.id];
    p.text(d.S.weightNames[wgt > 1 ? 2 : wgt < 1 ? 0 : 1], tc.weight, y - 1, { font: 'sans', size: 8.2, color: wgt === 1 ? C.ink3 : C.ink });
    p.text(d.S.answeredOf(t.answered, t.total), tc.answered, y - 1, { font: 'sans', size: 8.2, color: C.ink2 });
    const r = ranges[i];
    p.rect(tc.bar, y - 6, tc.barW, 4, { fill: C.track });
    if (r.min !== null) {
      const x0 = tc.bar + (r.min / 100) * tc.barW;
      p.rect(x0, y - 7.5, Math.max(2, ((r.max - r.min) / 100) * tc.barW), 7, { fill: C.ink, radius: 1 });
      p.text(`${r.min}–${r.max}`, L + W, y - 1, { font: 'serif', size: 9, color: C.ink, align: 'right' });
    } else p.text('—', L + W, y - 1, { font: 'sans', size: 8.2, color: C.ink3, align: 'right' });
    p.line(L, y + 5, L + W, y + 5, { color: C.line, width: 0.4 });
  });

  // ================= page 3: your answers, one grid
  let rowPad = 3.7; // sized below so the whole grid fits on one page when it can
  const FS = 7;
  const LEAD = 1.12;
  const gutter = 13;
  const tuW = 20;
  const np = d.parties.length;
  const cellW = 13.2;
  const gridX = L + W - np * cellW;
  const stX = L + gutter;
  const stW = gridX - 6 - tuW - 6 - stX;
  const headH = 48;
  const tuX = stX + stW + 6;
  const rowsOf = (g) => g.rows.map((r) => ({ ...r, lines: wrap(F.sans.metrics, r.text, FS, stW) }));
  const groups = [];
  for (const r of d.answerRows) {
    let g = groups[groups.length - 1];
    if (!g || g.topicId !== r.topicId) groups.push((g = { topicId: r.topicId, rows: [] }));
    g.rows.push(r);
  }
  const rowH = (r) => r.lines.length * FS * LEAD + rowPad * 2;
  const drawGridHead = (pg, y0) => {
    caps(pg, d.S.you, tuX + tuW / 2, y0 + headH - 3, { size: 5.8, align: 'center', lang: d.lang });
    d.parties.forEach((party, i) => {
      const cx = gridX + i * cellW + cellW / 2;
      pg.text(fit(F.sans.metrics, party.name, 6.4, headH - 8), cx + 2.2, y0 + headH - 3, { font: 'sans', size: 6.4, color: party.limited ? C.ink3 : C.ink2, angle: 90 });
    });
    pg.line(L, y0 + headH, L + W, y0 + headH, { color: C.ink, width: 0.8 });
    return y0 + headH;
  };
  p = newPage();
  y = 86;
  y = sectionHead(p, d, y, '03', d.S.sec3, d.S.answersTitle, 18);
  y += 13;
  y += paragraph(p, F, d.S.answersHow, L, y, W, { size: 8.2, color: C.ink2, lead: 1.4 });
  // legend
  y += 3;
  const leg = [
    ['+', d.S.legPlus],
    ['0', d.S.legZero],
    ['–', d.S.legMinus],
    ['·', d.S.legDot],
  ];
  let gx = L;
  for (const [sym, label] of leg) {
    p.rect(gx, y - 7.5, 12, 10, { fill: C.cell, radius: 1.5 });
    p.text(sym, gx + 6, y + 0.4, { font: 'sansBold', size: 7.2, color: C.ink, align: 'center' });
    p.text(label, gx + 16, y, { font: 'sans', size: 7, color: C.ink2 });
    gx += 16 + measure(F.sans.metrics, label, 7) + 12;
  }
  y += 13;
  const shadeLegend = (x) => {
    for (let i = 0; i < 5; i++) p.rect(x + i * 9, y - 7.5, 8, 10, { fill: shade(i / 4) });
    p.text(d.S.legShade, x + 50, y, { font: 'sans', size: 7, color: C.ink2 });
  };
  shadeLegend(L);
  y += 8;
  {
    const all = groups.flatMap((g) => rowsOf(g));
    const textSum = all.reduce((t, r) => t + r.lines.length * FS * LEAD, 0);
    const avail = BOTTOM - (y + headH) - 2;
    rowPad = Math.min(4.6, Math.max(2.2, (avail - textSum) / (2 * all.length)));
  }
  y = drawGridHead(p, y);
  for (const g0 of groups) {
    const g = { ...g0, rows: rowsOf(g0) };
    const gh = g.rows.reduce((s, r) => s + rowH(r), 0);
    if (y + gh > BOTTOM) {
      p = newPage();
      y = 96;
      caps(p, `${d.S.answersTitle} · ${d.S.cont}`, L, y, { lang: d.lang, size: 6.6 });
      y = drawGridHead(p, y + 10);
    }
    const t = d.topics.find((x) => x.id === g.topicId);
    const y0 = y;
    for (const r of g.rows) {
      const h = rowH(r);
      r.lines.forEach((l, k) => p.text(l, stX, y + rowPad + FS * 0.92 + k * FS * LEAD, { font: 'sans', size: FS, color: C.ink }));
      const sy = r.user === null || r.user === undefined ? '·' : USER_SYM[r.user];
      p.text(sy, tuX + tuW / 2, y + h / 2 + 2.6, { font: 'sansBold', size: 7.6, color: r.user === null ? C.ink3 : C.ink, align: 'center' });
      r.cells.forEach((c, i) => {
        const x = gridX + i * cellW + 0.9;
        const w = cellW - 1.8;
        const hh = h - 3;
        const gy = y + 1.5;
        if (c.agreement !== null && c.agreement !== undefined) {
          p.rect(x, gy, w, hh, { fill: shade(c.agreement), radius: 1.5 });
          p.text(STANCE_SYM[c.stance] || '·', x + w / 2, gy + hh / 2 + 2.5, { font: 'sansBold', size: 7.2, color: c.agreement >= 0.6 ? C.white : C.ink, align: 'center' });
        } else if (c.stance) {
          p.rect(x, gy, w, hh, { stroke: C.line2, lineWidth: 0.5, radius: 1.5 });
          p.text(STANCE_SYM[c.stance], x + w / 2, gy + hh / 2 + 2.5, { font: 'sansBold', size: 7.2, color: C.ink3, align: 'center' });
        } else p.text('·', x + w / 2, gy + hh / 2 + 2.5, { font: 'sans', size: 7.2, color: C.line2, align: 'center' });
      });
      y += h;
      p.line(stX, y, L + W, y, { color: C.line, width: 0.4 });
    }
    // topic marker: colour bar and the topic name running up the left edge
    p.rect(L, y0 + 1, 2.4, y - y0 - 2, { fill: t.accent });
    p.text(fit(F.sansBold.metrics, t.short.toLocaleUpperCase(d.lang), 5.2, y - y0 - 6), L + 9.2, y - 4, { font: 'sansBold', size: 5.2, color: t.accent, angle: 90, tracking: 0.5 });
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
