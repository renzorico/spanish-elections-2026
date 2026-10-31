// Minimal vector PDF writer with embedded TrueType fonts. No library and no network
// beyond the site's own font files. Text is real, selectable text (WinAnsi encoding);
// shapes are vector paths. Also provides a canvas "painter" with the same drawing API so
// one layout can produce both a PDF page and a PNG image.
//
// Coordinates: points, origin at the TOP-LEFT of the page (converted internally).

const enc = new TextEncoder();

/** Map a JS string to WinAnsi (cp1252) byte codes; unsupported characters become '?'. */
const CP1252_EXTRA = { 0x20ac: 0x80, 0x201a: 0x82, 0x201e: 0x84, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99, 0x203a: 0x9b, 0x2039: 0x8b, 0x02c6: 0x88, 0x02dc: 0x98, 0x0152: 0x8c, 0x0153: 0x9c };
export function winAnsiCodes(str) {
  const out = [];
  for (const ch of String(str).normalize('NFC')) {
    const c = ch.codePointAt(0);
    if (c === 0x2212) out.push(0x2d);
    else if (c === 0x00a0 || c === 0x202f || c === 0x2009) out.push(0x20);
    else if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff)) out.push(c);
    else if (CP1252_EXTRA[c]) out.push(CP1252_EXTRA[c]);
    else out.push(0x3f);
  }
  return out;
}

/** Width of `str` in points for a font metrics object at `size`. */
export function measure(metrics, str, size) {
  let w = 0;
  for (const c of winAnsiCodes(str)) w += metrics.widths[c - metrics.first] || 0;
  return (w * size) / 1000;
}

/** Greedy word wrap using font metrics. Returns an array of lines. */
export function wrap(metrics, str, size, maxWidth) {
  const words = String(str).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || measure(metrics, next, size) <= maxWidth) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Shorten `str` with an ellipsis so it fits `maxWidth`. */
export function fit(metrics, str, size, maxWidth) {
  if (measure(metrics, str, size) <= maxWidth) return str;
  let s = String(str);
  while (s.length > 1 && measure(metrics, `${s}…`, size) > maxWidth) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function rgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => +v.toFixed(3));
}
const num = (v) => (Math.round(v * 100) / 100).toString();
function pdfText(codes) {
  let s = '(';
  for (const c of codes) {
    if (c === 0x28 || c === 0x29 || c === 0x5c) s += `\\${String.fromCharCode(c)}`;
    else if (c < 0x20 || c > 0x7e) s += `\\${c.toString(8).padStart(3, '0')}`;
    else s += String.fromCharCode(c);
  }
  return `${s})`;
}
function pdfUtf16(str) {
  let hex = 'FEFF';
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c > 0xffff) {
      const v = c - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
    } else hex += c.toString(16).padStart(4, '0');
  }
  return `<${hex.toUpperCase()}>`;
}

async function deflate(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  const cs = new CompressionStream('deflate');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(cs));
  return new Uint8Array(await out.arrayBuffer());
}

class PdfPage {
  constructor(doc, width, height) {
    this.doc = doc;
    this.width = width;
    this.height = height;
    this.ops = [];
    this.links = [];
    this.fontsUsed = new Set();
    this.images = [];
  }
  _y(y) {
    return this.height - y;
  }
  _rrPath(x, y, w, h, r) {
    const Y = this._y(y + h);
    if (!r) return `${num(x)} ${num(Y)} ${num(w)} ${num(h)} re`;
    r = Math.min(r, w / 2, h / 2);
    const k = 0.5523 * r;
    const x1 = x + w;
    const y0 = Y;
    const y1 = Y + h;
    return [
      `${num(x + r)} ${num(y0)} m`,
      `${num(x1 - r)} ${num(y0)} l`,
      `${num(x1 - r + k)} ${num(y0)} ${num(x1)} ${num(y0 + r - k)} ${num(x1)} ${num(y0 + r)} c`,
      `${num(x1)} ${num(y1 - r)} l`,
      `${num(x1)} ${num(y1 - r + k)} ${num(x1 - r + k)} ${num(y1)} ${num(x1 - r)} ${num(y1)} c`,
      `${num(x + r)} ${num(y1)} l`,
      `${num(x + r - k)} ${num(y1)} ${num(x)} ${num(y1 - r + k)} ${num(x)} ${num(y1 - r)} c`,
      `${num(x)} ${num(y0 + r)} l`,
      `${num(x)} ${num(y0 + r - k)} ${num(x + r - k)} ${num(y0)} ${num(x + r)} ${num(y0)} c`,
      'h',
    ].join(' ');
  }
  rect(x, y, w, h, { fill, stroke, lineWidth = 0.75, radius = 0 } = {}) {
    const ops = [];
    if (fill) ops.push(`${rgb(fill).join(' ')} rg`);
    if (stroke) ops.push(`${rgb(stroke).join(' ')} RG ${num(lineWidth)} w`);
    ops.push(this._rrPath(x, y, w, h, radius));
    ops.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
    this.ops.push(`q ${ops.join(' ')} Q`);
  }
  line(x1, y1, x2, y2, { color = '#000000', width = 0.75, dash = null } = {}) {
    this.ops.push(`q ${rgb(color).join(' ')} RG ${num(width)} w ${dash ? `[${dash.map(num).join(' ')}] 0 d` : ''} ${num(x1)} ${num(this._y(y1))} m ${num(x2)} ${num(this._y(y2))} l S Q`);
  }
  circle(cx, cy, r, { fill = '#000000' } = {}) {
    const k = 0.5523 * r;
    const Y = this._y(cy);
    this.ops.push(
      `q ${rgb(fill).join(' ')} rg ${num(cx + r)} ${num(Y)} m ${num(cx + r)} ${num(Y + k)} ${num(cx + k)} ${num(Y + r)} ${num(cx)} ${num(Y + r)} c ${num(cx - k)} ${num(Y + r)} ${num(cx - r)} ${num(Y + k)} ${num(cx - r)} ${num(Y)} c ${num(cx - r)} ${num(Y - k)} ${num(cx - k)} ${num(Y - r)} ${num(cx)} ${num(Y - r)} c ${num(cx + k)} ${num(Y - r)} ${num(cx + r)} ${num(Y - k)} ${num(cx + r)} ${num(Y)} c f Q`,
    );
  }
  /** Text at baseline y. align: left | right | center (x is the anchor). */
  text(str, x, y, { font = 'sans', size = 10, color = '#000000', align = 'left', tracking = 0, angle = 0 } = {}) {
    if (str === undefined || str === null || str === '') return 0;
    const m = this.doc.metrics(font);
    const codes = winAnsiCodes(str);
    const w = measure(m, str, size) + tracking * Math.max(0, codes.length - 1);
    const off = align === 'right' ? -w : align === 'center' ? -w / 2 : 0;
    this.fontsUsed.add(font);
    // angle in degrees, counter-clockwise (text rising to the right)
    const a = (angle * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const tx = x + off * cos;
    const ty = this._y(y) + off * sin;
    this.ops.push(`BT /${this.doc.fontRes(font)} ${num(size)} Tf ${num(tracking)} Tc ${rgb(color).join(' ')} rg ${num(cos)} ${num(sin)} ${num(-sin)} ${num(cos)} ${num(tx)} ${num(ty)} Tm ${pdfText(codes)} Tj ET`);
    return w;
  }
  /** JPEG image (bytes) placed at x,y with size w,h. */
  image(jpeg, x, y, w, h) {
    const name = this.doc.addImage(jpeg);
    this.images.push(name);
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(this._y(y + h))} cm /${name} Do Q`);
  }
  link(x, y, w, h, url) {
    this.links.push({ x, y: this._y(y + h), w, h, url });
  }
}

export class PdfDoc {
  /** fonts: { key: { metrics, bytes } } */
  constructor({ width = 595.28, height = 841.89, fonts, title = '' }) {
    this.width = width;
    this.height = height;
    this.fonts = fonts;
    this.title = title;
    this.pages = [];
    this.imgs = [];
    this.fontKeys = Object.keys(fonts);
  }
  metrics(font) {
    const f = this.fonts[font];
    if (!f) throw new Error(`Unknown font ${font}`);
    return f.metrics;
  }
  fontRes(font) {
    return `F${this.fontKeys.indexOf(font) + 1}`;
  }
  addImage(jpeg) {
    this.imgs.push(jpeg);
    return `Im${this.imgs.length}`;
  }
  addPage() {
    const p = new PdfPage(this, this.width, this.height);
    this.pages.push(p);
    return p;
  }
  measure(str, font, size) {
    return measure(this.metrics(font), str, size);
  }
  wrap(str, font, size, maxWidth) {
    return wrap(this.metrics(font), str, size, maxWidth);
  }
  fit(str, font, size, maxWidth) {
    return fit(this.metrics(font), str, size, maxWidth);
  }

  /** Serialise to bytes. Streams are Flate-compressed when the browser supports it. */
  async toBytes() {
    const objs = []; // index = obj number - 1; each entry: array of Uint8Array/string parts
    const reserve = () => objs.push(null) && objs.length;
    const set = (n, parts) => {
      objs[n - 1] = parts;
    };
    const stream = async (dict, data, compress = true) => {
      const raw = typeof data === 'string' ? enc.encode(data) : data;
      const z = compress ? await deflate(raw) : null;
      const body = z || raw;
      return [`<< ${dict}${z ? ' /Filter /FlateDecode' : ''} /Length ${body.length} >>\nstream\n`, body, '\nendstream'];
    };

    const catalog = reserve();
    const pagesObj = reserve();
    const info = reserve();
    // fonts
    const fontObj = {};
    for (const key of this.fontKeys) {
      const { metrics: m, bytes } = this.fonts[key];
      const file = reserve();
      set(file, await stream(`/Length1 ${bytes.length}`, bytes));
      const desc = reserve();
      set(desc, [
        `<< /Type /FontDescriptor /FontName /${m.psName} /Flags 32 /FontBBox [${m.bbox.join(' ')}] /ItalicAngle ${m.italicAngle} /Ascent ${m.ascent} /Descent ${m.descent} /CapHeight ${m.capHeight} /StemV ${m.stemV} /FontFile2 ${file} 0 R >>`,
      ]);
      const f = reserve();
      set(f, [`<< /Type /Font /Subtype /TrueType /BaseFont /${m.psName} /FirstChar ${m.first} /LastChar ${m.first + m.widths.length - 1} /Widths [${m.widths.join(' ')}] /Encoding /WinAnsiEncoding /FontDescriptor ${desc} 0 R >>`]);
      fontObj[key] = f;
    }
    const imgObj = [];
    for (const jpeg of this.imgs) {
      const { w, h } = jpegSize(jpeg);
      const n = reserve();
      set(n, await stream(`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, jpeg, false));
      imgObj.push(n);
    }
    const fontDict = `<< ${this.fontKeys.map((k) => `/${this.fontRes(k)} ${fontObj[k]} 0 R`).join(' ')} >>`;
    const xobjDict = imgObj.length ? ` /XObject << ${imgObj.map((n, i) => `/Im${i + 1} ${n} 0 R`).join(' ')} >>` : '';
    const kids = [];
    for (const p of this.pages) {
      const content = reserve();
      set(content, await stream('', p.ops.join('\n')));
      const annots = p.links.map((l) => {
        const a = reserve();
        const uri = l.url.replace(/[()\\]/g, (c) => `\\${c}`);
        set(a, [`<< /Type /Annot /Subtype /Link /Rect [${num(l.x)} ${num(l.y)} ${num(l.x + l.w)} ${num(l.y + l.h)}] /Border [0 0 0] /A << /S /URI /URI (${uri}) >> >>`]);
        return a;
      });
      const page = reserve();
      set(page, [
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${num(this.width)} ${num(this.height)}] /Resources << /Font ${fontDict}${xobjDict} >> /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(' ')}]` : ''} >>`,
      ]);
      kids.push(page);
    }
    set(pagesObj, [`<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`]);
    set(catalog, [`<< /Type /Catalog /Pages ${pagesObj} 0 R /Lang (es) >>`]);
    set(info, [`<< /Title ${pdfUtf16(this.title)} /Producer (29N) >>`]);

    // header + binary comment (high bytes mark the file as binary)
    const chunks = [new Uint8Array([...enc.encode('%PDF-1.4\n'), 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])];
    let offset = chunks[0].length;
    const offsets = [];
    objs.forEach((parts, i) => {
      offsets.push(offset);
      const all = [`${i + 1} 0 obj\n`, ...parts, '\nendobj\n'];
      for (const part of all) {
        const b = typeof part === 'string' ? enc.encode(part) : part;
        chunks.push(b);
        offset += b.length;
      }
    });
    const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
    chunks.push(enc.encode(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`));
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  }
}

function jpegSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xc3) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + len;
  }
  throw new Error('Invalid JPEG');
}

/** Canvas painter with the same drawing API as a PDF page (for PNG export). */
export class CanvasPage {
  constructor(ctx, width, height, fonts, scale = 2) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.fonts = fonts; // { key: { metrics, css: 'weight family' } }
    this.s = scale;
    this.links = [];
  }
  rect(x, y, w, h, { fill, stroke, lineWidth = 0.75, radius = 0 } = {}) {
    const c = this.ctx;
    const s = this.s;
    c.beginPath();
    if (c.roundRect && radius) c.roundRect(x * s, y * s, w * s, h * s, radius * s);
    else c.rect(x * s, y * s, w * s, h * s);
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lineWidth * s;
      c.stroke();
    }
  }
  line(x1, y1, x2, y2, { color = '#000', width = 0.75, dash = null } = {}) {
    const c = this.ctx;
    const s = this.s;
    c.save();
    c.beginPath();
    c.setLineDash(dash ? dash.map((d) => d * s) : []);
    c.moveTo(x1 * s, y1 * s);
    c.lineTo(x2 * s, y2 * s);
    c.strokeStyle = color;
    c.lineWidth = width * s;
    c.stroke();
    c.restore();
  }
  circle(cx, cy, r, { fill = '#000' } = {}) {
    const c = this.ctx;
    c.beginPath();
    c.arc(cx * this.s, cy * this.s, r * this.s, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
  }
  text(str, x, y, { font = 'sans', size = 10, color = '#000', align = 'left', tracking = 0, angle = 0 } = {}) {
    if (str === undefined || str === null || str === '') return 0;
    const c = this.ctx;
    const f = this.fonts[font];
    const w = measure(f.metrics, str, size) + tracking * Math.max(0, String(str).length - 1);
    const off = align === 'right' ? -w : align === 'center' ? -w / 2 : 0;
    c.save();
    c.translate(x * this.s, y * this.s);
    if (angle) c.rotate((-angle * Math.PI) / 180);
    c.font = `${f.css.split(' ')[0]} ${size * this.s}px ${f.css.split(' ').slice(1).join(' ')}`;
    c.fillStyle = color;
    c.textBaseline = 'alphabetic';
    if ('letterSpacing' in c) c.letterSpacing = `${tracking * this.s}px`;
    c.fillText(String(str), off * this.s, 0);
    c.restore();
    return w;
  }
  image(img, x, y, w, h) {
    if (img && typeof img.width === 'number') this.ctx.drawImage(img, x * this.s, y * this.s, w * this.s, h * this.s);
  }
  link() {}
}
