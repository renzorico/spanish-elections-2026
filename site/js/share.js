// Shareable results card (PNG) and one-page PDF, generated entirely in the browser.
// No library, no network: the card is drawn on a canvas; the PDF wraps that image in a
// minimal hand-written PDF with a clickable link to the quiz. Nothing is uploaded or stored.

export const SITE_URL = 'https://renzorico.github.io/spanish-elections-2026/';
const W = 1080;
const H = 1350;
const C = { paper: '#f6f2ea', surface: '#fffdf8', ink: '#1c1a17', ink2: '#57524a', ink3: '#8a8378', line: '#e4ddd0' };

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function drawMark(ctx, x, y, s) {
  // ballot going into a ballot box (same drawing as the site logo, 34-unit grid)
  const k = s / 34;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.save();
  ctx.translate(17, 11);
  ctx.rotate((-9 * Math.PI) / 180);
  ctx.translate(-17, -11);
  rr(ctx, 10, 2.5, 14, 16, 2.2);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(13.6, 10.6);
  ctx.lineTo(16, 13);
  ctx.lineTo(20.6, 8);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  rr(ctx, 2.5, 15, 29, 16.5, 5);
  ctx.fillStyle = C.ink;
  ctx.fill();
  rr(ctx, 9, 18.6, 16, 2.2, 1.1);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.restore();
}

/**
 * Draw the card. `data` = {
 *   strings: {cardTitle, cardSubtitle, cardOrder, cardTopics, cardNoTopics, cardWhere(p), cardAnswered(n), cardLimited, cardFoot, cardCta},
 *   place: string, answered: number,
 *   parties: [{ name, logo, pct (0..1|null), limited }]  (already sorted),
 *   topics: [{ label, accent, tint, icon }]  (key topics)
 * }
 */
export async function drawCard(data) {
  if (document.fonts?.load) {
    await Promise.all([document.fonts.load('700 60px Fraunces'), document.fonts.load('400 24px Atkinson'), document.fonts.load('700 24px Atkinson')]).catch(() => {});
  }
  const s = data.strings;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const SERIF = 'Fraunces, Georgia, serif';
  const SANS = 'Atkinson, system-ui, Arial, sans-serif';
  const PAD = 72;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // decorative topic stripe at the top
  const stripeW = (W - PAD * 2) / Math.max(1, data.palette.length);
  data.palette.forEach((col, i) => {
    ctx.fillStyle = col;
    rr(ctx, PAD + i * stripeW + 2, 40, stripeW - 4, 10, 5);
    ctx.fill();
  });

  // header
  drawMark(ctx, PAD, 82, 58);
  ctx.fillStyle = C.ink;
  ctx.font = `700 40px ${SERIF}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('29N', PAD + 74, 122);
  ctx.font = `400 22px ${SANS}`;
  ctx.fillStyle = C.ink2;
  ctx.fillText(s.cardSubtitle, PAD + 74, 150);

  ctx.fillStyle = C.ink;
  ctx.font = `700 78px ${SERIF}`;
  ctx.fillText(s.cardTitle, PAD, 252);
  ctx.font = `400 24px ${SANS}`;
  ctx.fillStyle = C.ink2;
  ctx.fillText(fitText(ctx, `${s.cardWhere(data.place)} · ${s.cardAnswered(data.answered)}`, W - PAD * 2), PAD, 296);

  // party rows
  const rows = data.parties.slice(0, 13);
  const top = 336;
  const areaH = 650;
  const rowH = Math.min(84, Math.floor(areaH / Math.max(rows.length, 1)));
  const logoS = Math.min(50, rowH - 12);
  ctx.font = `700 18px ${SANS}`;
  ctx.fillStyle = C.ink3;
  ctx.fillText(s.cardOrder.toUpperCase(), PAD, top);
  const nameX = PAD + logoS + 20;
  const barX = PAD + logoS + 280;
  const pctX = W - PAD;
  const barW = pctX - 120 - barX;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = top + 18 + i * rowH;
    const cy = y + rowH / 2;
    // logo
    rr(ctx, PAD, cy - logoS / 2, logoS, logoS, 12);
    if (r.logo) {
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      const iw = r.logo.naturalWidth || r.logo.width || 1;
      const ih = r.logo.naturalHeight || r.logo.height || 1;
      const k = Math.min((logoS * 0.8) / iw, (logoS * 0.8) / ih);
      ctx.drawImage(r.logo, PAD + (logoS - iw * k) / 2, cy - (ih * k) / 2, iw * k, ih * k);
    } else {
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.fillStyle = C.paper;
      ctx.font = `700 ${Math.round(logoS * (r.mono.length > 3 ? 0.26 : 0.34))}px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText(r.mono, PAD + logoS / 2, cy + logoS * 0.12);
      ctx.textAlign = 'left';
    }
    // name
    ctx.fillStyle = C.ink;
    ctx.font = `700 ${Math.min(30, rowH * 0.45)}px ${SANS}`;
    ctx.fillText(fitText(ctx, r.name + (r.limited ? ' *' : ''), barX - nameX - 16), nameX, cy + 10);
    // bar
    rr(ctx, barX, cy - 7, barW, 14, 7);
    ctx.fillStyle = C.line;
    ctx.fill();
    if (r.pct !== null) {
      rr(ctx, barX, cy - 7, Math.max(14, barW * r.pct), 14, 7);
      ctx.fillStyle = C.ink;
      ctx.fill();
    }
    // percentage
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.min(38, rowH * 0.58)}px ${SERIF}`;
    ctx.fillStyle = C.ink;
    ctx.fillText(r.pct === null ? '—' : `${Math.round(r.pct * 100)}%`, pctX, cy + 13);
    ctx.textAlign = 'left';
  }
  let rowsEnd = top + 18 + rows.length * rowH;
  if (rows.some((r) => r.limited)) {
    ctx.font = `400 18px ${SANS}`;
    ctx.fillStyle = C.ink3;
    ctx.fillText(s.cardLimited, PAD, rowsEnd + 24);
    rowsEnd += 30;
  }

  // key topics (right under the list, never into the footer)
  let ty = Math.min(rowsEnd + 64, H - PAD - 150 - 28 - 104);
  ctx.font = `700 18px ${SANS}`;
  ctx.fillStyle = C.ink3;
  ctx.fillText(s.cardTopics.toUpperCase(), PAD, ty);
  ty += 16;
  let tx = PAD;
  if (!data.topics.length) {
    ctx.font = `400 24px ${SANS}`;
    ctx.fillStyle = C.ink2;
    ctx.fillText(s.cardNoTopics, PAD, ty + 34);
  }
  for (const tp of data.topics) {
    ctx.font = `700 24px ${SANS}`;
    const w = ctx.measureText(tp.label).width + 78;
    rr(ctx, tx, ty, w, 52, 26);
    ctx.fillStyle = tp.tint;
    ctx.fill();
    if (tp.iconImg) ctx.drawImage(tp.iconImg, tx + 14, ty + 11, 30, 30);
    ctx.fillStyle = tp.accent;
    ctx.fillText(tp.label, tx + 52, ty + 34);
    tx += w + 12;
  }

  // footer: CTA + QR
  const qr = await loadImage('img/qr.svg');
  const qrS = 150;
  const fy = H - PAD - qrS;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, fy - 28);
  ctx.lineTo(W - PAD, fy - 28);
  ctx.stroke();
  if (qr) {
    rr(ctx, W - PAD - qrS - 12, fy - 12, qrS + 24, qrS + 24, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, W - PAD - qrS, fy, qrS, qrS);
    ctx.imageSmoothingEnabled = true;
  }
  ctx.fillStyle = C.ink;
  ctx.font = `700 44px ${SERIF}`;
  ctx.fillText(s.cardCta, PAD, fy + 48);
  ctx.font = `700 26px ${SANS}`;
  const urlText = SITE_URL.replace('https://', '').replace(/\/$/, '');
  ctx.fillText(urlText, PAD, fy + 94);
  const urlBox = { x: PAD, y: fy + 66, w: ctx.measureText(urlText).width, h: 36 };
  ctx.font = `400 20px ${SANS}`;
  ctx.fillStyle = C.ink2;
  ctx.fillText(fitText(ctx, s.cardFoot, W - PAD * 2 - qrS - 40), PAD, fy + 140);

  return { canvas, urlBox, qrBox: { x: W - PAD - qrS, y: fy, w: qrS, h: qrS } };
}

/** Resolve logos and topic icons into images before drawing. */
export async function prepareCardData(data) {
  const parties = await Promise.all(data.parties.map(async (p) => ({ ...p, logo: await loadImage(p.logoSrc) })));
  const topics = await Promise.all(data.topics.map(async (t) => ({ ...t, iconImg: await loadImage(t.icon) })));
  return { ...data, parties, topics };
}

// ---------- minimal PDF writer: one page, one JPEG, one link annotation
const enc = new TextEncoder();

function pdfString(str) {
  // UTF-16BE hex string with BOM, safe for any characters
  let hex = 'FEFF';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    const units = cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp];
    for (const u of units) hex += u.toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}

export function buildPdf(jpegBytes, imgW, imgH, { links = [], title = '' } = {}) {
  const pageW = 595.28;
  const pageH = +(pageW * (imgH / imgW)).toFixed(2);
  const sx = pageW / imgW;
  const sy = pageH / imgH;
  const annots = links.map((l) => {
    const x1 = (l.x * sx).toFixed(2);
    const x2 = ((l.x + l.w) * sx).toFixed(2);
    const y1 = (pageH - (l.y + l.h) * sy).toFixed(2);
    const y2 = (pageH - l.y * sy).toFixed(2);
    return `<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /S /URI /URI (${l.url.replace(/[()\\]/g, '\\$&')}) >> >>`;
  });
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  const objs = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  const annotRefs = annots.map((_, i) => `${7 + i} 0 R`).join(' ');
  objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R${annots.length ? ` /Annots [${annotRefs}]` : ''} >>`);
  objs.push({ dict: `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`, stream: jpegBytes });
  objs.push({ dict: `<< /Length ${enc.encode(content).length} >>`, stream: enc.encode(content) });
  objs.push(`<< /Title ${pdfString(title)} /Producer (29N) >>`);
  for (const a of annots) objs.push(a);

  const parts = [];
  let offset = 0;
  const push = (u8) => {
    parts.push(u8);
    offset += u8.length;
  };
  push(enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\u0080-ÿ]/g, 'A')));
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(offset);
    if (typeof o === 'string') push(enc.encode(`${i + 1} 0 obj\n${o}\nendobj\n`));
    else {
      push(enc.encode(`${i + 1} 0 obj\n${o.dict}\nstream\n`));
      push(o.stream);
      push(enc.encode('\nendstream\nendobj\n'));
    }
  });
  const xrefAt = offset;
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`;
  push(enc.encode(`${xref}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`));
  return new Blob(parts, { type: 'application/pdf' });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadPdf(card, title) {
  const jpg = await canvasBlob(card.canvas, 'image/jpeg', 0.92);
  const bytes = new Uint8Array(await jpg.arrayBuffer());
  const links = [
    { ...card.urlBox, url: SITE_URL },
    { ...card.qrBox, url: SITE_URL },
  ];
  download(buildPdf(bytes, card.canvas.width, card.canvas.height, { links, title }), '29N-mis-coincidencias.pdf');
}

export async function shareImage(card, text) {
  const blob = await canvasBlob(card.canvas, 'image/png');
  const file = new File([blob], '29N-mis-coincidencias.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${text} ${SITE_URL}` });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  download(blob, '29N-mis-coincidencias.png');
  return 'downloaded';
}
