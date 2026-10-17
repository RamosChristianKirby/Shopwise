// A tiny dependency-free PDF writer: text (Helvetica / Helvetica-Bold), lines and rectangles,
// multiple pages. Enough for clean invoices without pulling in a PDF library.
// Coordinates are in points with the origin at the TOP-left of the page.

const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

// Characters outside the standard font's encoding are replaced with close ASCII equivalents.
const REPLACE = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '•': '-', '×': 'x', '₱': 'PHP ', '…': '...', ' ': ' ' };

export function clean(str) {
  return String(str ?? '')
    .replace(/[‘’“”–—•×₱… ]/g, (c) => REPLACE[c])
    .replace(/[^\x20-\x7E¡-ÿ]/g, '?');
}

export function textWidth(str, size, bold = false) {
  const table = bold ? W_BOLD : W_REG;
  let w = 0;
  for (const ch of clean(str)) {
    const code = ch.charCodeAt(0);
    w += code >= 32 && code <= 126 ? table[code - 32] : 556;
  }
  return (w * size) / 1000;
}

/** Splits text into lines that fit maxWidth. */
export function wrap(str, size, maxWidth, bold = false) {
  const lines = [];
  for (const para of clean(str).split(/\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, bold) <= maxWidth || !line) line = next;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

const esc = (s) => clean(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const n = (v) => (Math.round(v * 100) / 100).toString();
const rgb = (hex = '#000000') => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
};

export class PdfDoc {
  constructor({ width = 595.28, height = 841.89, title = 'Document' } = {}) {
    this.width = width;
    this.height = height;
    this.title = title;
    this.pages = [];
    this.addPage();
  }

  addPage() {
    this.ops = [];
    this.pages.push(this.ops);
    return this;
  }

  text(x, y, str, { size = 10, bold = false, color = '#14171c', align = 'left', width = 0 } = {}) {
    let tx = x;
    if (align !== 'left') {
      const w = textWidth(str, size, bold);
      tx = align === 'right' ? x + width - w : x + (width - w) / 2;
    }
    const by = this.height - y - size; // y is the top of the text line
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${n(size)} Tf ${rgb(color)} rg ${n(tx)} ${n(by)} Td (${esc(str)}) Tj ET`);
    return this;
  }

  rect(x, y, w, h, { fill = null, stroke = null, lineWidth = 1 } = {}) {
    const by = this.height - y - h;
    const parts = [];
    if (fill) parts.push(`${rgb(fill)} rg`);
    if (stroke) parts.push(`${rgb(stroke)} RG ${n(lineWidth)} w`);
    parts.push(`${n(x)} ${n(by)} ${n(w)} ${n(h)} re ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
    this.ops.push(parts.join(' '));
    return this;
  }

  line(x1, y1, x2, y2, { color = '#e1e4ea', width = 1 } = {}) {
    this.ops.push(`${rgb(color)} RG ${n(width)} w ${n(x1)} ${n(this.height - y1)} m ${n(x2)} ${n(this.height - y2)} l S`);
    return this;
  }

  toBuffer() {
    const objects = [];
    const add = (body) => { objects.push(body); return objects.length; };

    const catalog = add(null);
    const pagesObj = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const info = add(`<< /Title (${esc(this.title)}) /Producer (Shopwise) >>`);

    const pageIds = this.pages.map((ops) => {
      const stream = ops.join('\n');
      const content = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
      return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${n(this.width)} ${n(this.height)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    objects.forEach((body, i) => {
      offsets.push(Buffer.byteLength(out, 'latin1'));
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = Buffer.byteLength(out, 'latin1');
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
  }
}
