// Generates a clean product placeholder image (SVG) from a name, so the demo store
// looks good with no internet and no image files. Real uploads replace these.

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

function wrap(text, max = 16, lines = 3) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if ((line + ' ' + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1].replace(/.{0,2}$/, '…');
  }
  return out;
}

export default function placeholderSvg(rawName = 'Product', variant = 0) {
  const name = String(rawName).replace(/\.svg$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 60) || 'Product';
  const h = (hash(name) + variant * 47) % 360;
  const h2 = (h + 38) % 360;
  const title = name.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const lines = wrap(title);
  const text = lines
    .map((l, i) => `<tspan x="400" dy="${i === 0 ? 0 : 38}">${esc(l)}</tspan>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${esc(name)}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 70% 90%)"/><stop offset="1" stop-color="hsl(${h2} 65% 78%)"/></linearGradient>
</defs>
<rect width="800" height="800" fill="url(#g)"/>
<circle cx="640" cy="150" r="230" fill="hsl(${h} 70% 96%)" opacity=".55"/>
<circle cx="120" cy="720" r="260" fill="hsl(${h2} 60% 60%)" opacity=".22"/>
<circle cx="400" cy="300" r="120" fill="hsl(${h} 55% 32%)" opacity=".92"/>
<text x="400" y="342" text-anchor="middle" font-family="Segoe UI, system-ui, Arial, sans-serif" font-size="112" font-weight="700" fill="hsl(${h} 70% 96%)">${esc(initials)}</text>
<text x="400" y="530" text-anchor="middle" font-family="Segoe UI, system-ui, Arial, sans-serif" font-size="34" font-weight="600" fill="hsl(${h} 45% 22%)">${text}</text>
</svg>`;
}
