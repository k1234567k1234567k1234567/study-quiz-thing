// Diagrams shown inside quiz questions and cue cards: function graphs and labelled biology
// pictures with an arrow. Graphs and the cell/neuron pictures are drawn from fixed specs, so the arrow
// and the numbers are always exact. Other topics use a picture the AI designed from plain shapes (see below).
import { hasKind, renderKind } from './diagrams2.js';
import { BIO2 } from './biopics.js';

const NS = 'http://www.w3.org/2000/svg';
const ARROW = '#e5322d';

/* ---------------- function graphs ---------------- */

const baseFn = {
  quad: (u) => u * u,
  sqrt: (u) => (u < 0 ? NaN : Math.sqrt(u)),
  abs: (u) => Math.abs(u),
  recip: (u) => (Math.abs(u) < 1e-9 ? NaN : 1 / u),
  lin: (u) => u,
  // a generic zig-zag "f" with end points, so stretches and shifts of the domain can be seen
  zig: (u) => zigAt(u),
};
const ZIG = [[-4, -1], [-2, 2], [0, 0], [2, -2], [4, 1]];
export function zigAt(u) {
  if (u < -4 || u > 4) return NaN;
  for (let i = 0; i < ZIG.length - 1; i++) {
    const [x1, y1] = ZIG[i]; const [x2, y2] = ZIG[i + 1];
    if (u >= x1 && u <= x2) return y1 + ((y2 - y1) * (u - x1)) / (x2 - x1);
  }
  return NaN;
}
const RAD = Math.PI / 180;

export function evalF(f, x) {
  switch (f.type) {
    case 'lin': return f.m * x + f.b;
    case 'quad': return f.a * (x - f.h) ** 2 + f.k;
    case 'sqrt': return x < f.h ? NaN : f.a * Math.sqrt(x - f.h) + f.k;
    case 'abs': return f.a * Math.abs(x - f.h) + f.k;
    case 'recip': return Math.abs(x - f.h) < 1e-9 ? NaN : f.a / (x - f.h) + f.k;
    // a * base(k * (x - d)) + c for a parent graph and its transformations
    case 'tr': return f.a * baseFn[f.base](f.k * (x - f.d)) + f.c;
    // angles are in degrees: a * sin(k * (x - d)) + c
    case 'sin': return f.a * Math.sin(f.k * (x - f.d) * RAD) + f.c;
    case 'cos': return f.a * Math.cos(f.k * (x - f.d) * RAD) + f.c;
    case 'exp': return f.a * f.b ** x + f.k;
    // straight pieces through f.pts = [[x, y], ...] (used for motion graphs); undefined outside the points
    case 'pw': {
      const P = f.pts;
      if (x < P[0][0] || x > P[P.length - 1][0]) return NaN;
      for (let i = 0; i < P.length - 1; i++) if (x >= P[i][0] && x <= P[i + 1][0]) return P[i][1] + ((P[i + 1][1] - P[i][1]) * (x - P[i][0])) / ((P[i + 1][0] - P[i][0]) || 1);
      return NaN;
    }
    default: return NaN;
  }
}

let uidCount = 0;
const css = (name) => `var(--${name})`;

// spec: { f, from, to, fromOpen, toOpen, view:[x0,x1,y0,y1], xstep, ystep, size:[W,H],
//         curves:[{f, dash, color}], rel:{type:'circle'|'side',...}, marks:[{x,y,label,open,color}],
//         vline, hline, diag, discrete }
function renderGraph(spec) {
  const [W, H] = spec.size || [340, 340];
  const pad = 28;
  const [x0, x1, y0, y1] = spec.view || [-6, 6, -6, 6];
  const sx = (x) => pad + ((x - x0) / (x1 - x0)) * (W - 2 * pad);
  const sy = (y) => H - pad - ((y - y0) / (y1 - y0)) * (H - 2 * pad);
  const id = `clip${++uidCount}`;
  const parts = [];
  const xstep = spec.xstep || Math.max(1, Math.ceil((x1 - x0) / 12));
  const ystep = spec.ystep || Math.max(1, Math.ceil((y1 - y0) / 12));
  const axisX = Math.min(Math.max(0, y0), y1); // where the x axis sits
  const axisY = Math.min(Math.max(0, x0), x1);
  for (let x = Math.ceil(x0 / xstep) * xstep; x <= x1; x += xstep) {
    parts.push(`<line x1="${sx(x)}" y1="${pad}" x2="${sx(x)}" y2="${H - pad}" stroke="currentColor" stroke-opacity=".12"/>`);
    if (x !== 0) parts.push(`<text x="${sx(x)}" y="${Math.min(sy(axisX) + 14, H - 6)}" font-size="10" text-anchor="middle" fill="currentColor" fill-opacity=".8">${x}</text>`);
  }
  for (let y = Math.ceil(y0 / ystep) * ystep; y <= y1; y += ystep) {
    parts.push(`<line x1="${pad}" y1="${sy(y)}" x2="${W - pad}" y2="${sy(y)}" stroke="currentColor" stroke-opacity=".12"/>`);
    if (y !== 0) parts.push(`<text x="${Math.max(sx(axisY) - 6, 14)}" y="${sy(y) + 3}" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".8">${y}</text>`);
  }
  parts.push(`<line x1="${pad}" y1="${sy(axisX)}" x2="${W - pad}" y2="${sy(axisX)}" stroke="currentColor" stroke-opacity=".75" stroke-width="1.5"/>`);
  parts.push(`<line x1="${sx(axisY)}" y1="${pad}" x2="${sx(axisY)}" y2="${H - pad}" stroke="currentColor" stroke-opacity=".75" stroke-width="1.5"/>`);
  parts.push(`<text x="${W - pad - 2}" y="${sy(axisX) - 6}" text-anchor="end" font-size="12" font-style="italic" fill="currentColor">${spec.xlabel || 'x'}</text>`);
  parts.push(`<text x="${sx(axisY) + 6}" y="${pad - 8}" font-size="12" font-style="italic" fill="currentColor">${spec.ylabel || 'y'}</text>`);

  const span = y1 - y0;
  // a curve, broken wherever the function is undefined or jumps (asymptotes)
  const curvePath = (f, from, to) => {
    const lo = Math.max(x0, from ?? -Infinity);
    const hi = Math.min(x1, to ?? Infinity);
    let d = '';
    let prev = null;
    const N = 600;
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N;
      const y = evalF(f, x);
      if (!Number.isFinite(y) || Math.abs(y) > 1e4) { prev = null; continue; }
      const jump = prev !== null && Math.abs(y - prev) > span * 0.8;
      d += `${prev === null || jump ? 'M' : 'L'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)} `;
      prev = y;
    }
    return d;
  };
  const draw = (d, color, width, dash) => `<path d="${d}" fill="none" style="stroke:${css(color)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash ? ' stroke-dasharray="7 6"' : ''}/>`;
  const clipped = [];
  if (spec.diag) clipped.push(draw(`M${sx(x0)} ${sy(x0)} L${sx(x1)} ${sy(x1)}`, 'muted', 1.8, true));
  if (spec.vline != null) clipped.push(draw(`M${sx(spec.vline)} ${pad} L${sx(spec.vline)} ${H - pad}`, 'accent', 2, true));
  if (spec.hline != null) clipped.push(draw(`M${pad} ${sy(spec.hline)} L${W - pad} ${sy(spec.hline)}`, 'accent', 2, true));
  for (const c of spec.curves || []) clipped.push(draw(curvePath(c.f, c.from, c.to), c.color || 'accent', c.dash ? 2.5 : 3, c.dash));
  if (spec.rel?.type === 'circle') {
    const r = spec.rel;
    clipped.push(`<ellipse cx="${sx(r.cx)}" cy="${sy(r.cy)}" rx="${Math.abs(sx(r.cx + r.r) - sx(r.cx))}" ry="${Math.abs(sy(r.cy + r.r) - sy(r.cy))}" fill="none" style="stroke:${css('primary')}" stroke-width="3"/>`);
  } else if (spec.rel?.type === 'side') {
    const r = spec.rel; // x = a(y - k)^2 + h
    let d = '';
    for (let i = 0; i <= 400; i++) {
      const y = y0 + ((y1 - y0) * i) / 400;
      const x = r.a * (y - r.k) ** 2 + r.h;
      d += `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)} `;
    }
    clipped.push(draw(d, 'primary', 3));
  } else if (spec.f) clipped.push(draw(curvePath(spec.f, spec.from, spec.to), 'primary', 3));
  parts.push(`<g clip-path="url(#${id})">${clipped.join('')}</g>`);

  // end dots: closed = filled, open = hollow
  const dot = (x, y, open, color = 'primary') => {
    if (!Number.isFinite(y) || x < x0 || x > x1 || y < y0 || y > y1) return;
    parts.push(`<circle cx="${sx(x)}" cy="${sy(y)}" r="5" stroke-width="2.5" style="stroke:${css(color)};fill:${open ? 'var(--surface)' : css(color)}"/>`);
  };
  if (spec.f && !spec.discrete) {
    const ends = (x, open) => dot(x, evalF(spec.f, x), open);
    if (spec.from != null) ends(spec.from, !!spec.fromOpen);
    else if (spec.f.type === 'sqrt') ends(spec.f.h, false);
    if (spec.to != null) ends(spec.to, !!spec.toOpen);
  }
  for (const m of spec.marks || []) {
    dot(m.x, m.y, !!m.open, m.color || 'accent');
    if (m.label) parts.push(`<text x="${sx(m.x) + 8}" y="${sy(m.y) - 8}" font-size="13" font-weight="700" fill="currentColor">${m.label}</text>`);
  }

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', spec.label || 'Graph for the question');
  svg.innerHTML = `<defs><clipPath id="${id}"><rect x="${pad}" y="${pad}" width="${W - 2 * pad}" height="${H - 2 * pad}"/></clipPath></defs>${parts.join('')}`;
  return svg;
}

/* ---------------- biology pictures ---------------- */

const stroke = 'stroke="currentColor" stroke-opacity=".6"';
const bean = (cx, cy, rot, rx = 27, ry = 13) => `<g transform="rotate(${rot} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#f4a261" fill-opacity=".85" ${stroke} stroke-width="2"/><path d="M${cx - rx + 8} ${cy} q5 -9 10 0 t10 0 t10 0" fill="none" ${stroke} stroke-width="1.6"/></g>`;
const dots = (list) => list.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#6f9fcf" fill-opacity=".85"/>`).join('');
const tube = (x, y, w, color = '#4ea4a0') => `<path d="M${x} ${y} q${w / 4} -8 ${w / 2} 0 t${w / 2} 0" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;

function animalCell() {
  let rough = '';
  const rd = [];
  for (let i = 0; i < 4; i++) {
    const y = 128 + i * 18;
    rough += tube(248, y, 52);
    for (let k = 0; k < 5; k++) rd.push([253 + k * 10, y + (k % 2 ? 4 : -4) - 6]);
  }
  const smooth = [0, 1, 2].map((i) => tube(135 + (i % 2) * 8, 232 + i * 9, 80, '#7bb36b')).join('');
  const golgi = [0, 1, 2, 3].map((i) => `<path d="M${82 + i * 4} ${118 + i * 11} q22 -9 44 0" fill="none" stroke="#d9a441" stroke-width="6" stroke-linecap="round"/>`).join('');
  return `<ellipse cx="200" cy="160" rx="150" ry="120" fill="#f6c8b8" fill-opacity=".45" stroke="currentColor" stroke-opacity=".8" stroke-width="3"/>
<circle cx="185" cy="150" r="50" fill="#b9a7e6" fill-opacity=".75" ${stroke} stroke-width="2.5"/>
<circle cx="185" cy="150" r="43" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3"/>
<circle cx="195" cy="158" r="14" fill="#6a4fb3" fill-opacity=".8"/>
${bean(285, 92, -20)}${bean(95, 215, 25)}${rough}${dots(rd)}${smooth}${golgi}
<circle cx="300" cy="200" r="11" fill="#e07a9b" fill-opacity=".85" ${stroke} stroke-width="2"/>
${dots([[258, 230], [266, 236], [274, 229], [282, 235]])}
<g fill="#8a6d3b" fill-opacity=".85" ${stroke}><rect x="222" y="66" width="26" height="8" rx="3"/><rect x="231" y="76" width="8" height="26" rx="3" transform="translate(0 -4)"/></g>`;
}

function plantCell() {
  const chloro = (cx, cy, rot) => `<g transform="rotate(${rot} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="22" ry="12" fill="#5fb85f" fill-opacity=".9" ${stroke} stroke-width="2"/><g fill="#2f7d3a" fill-opacity=".8"><rect x="${cx - 12}" y="${cy - 4}" width="7" height="8" rx="2"/><rect x="${cx - 3}" y="${cy - 4}" width="7" height="8" rx="2"/><rect x="${cx + 6}" y="${cy - 4}" width="7" height="8" rx="2"/></g></g>`;
  return `<rect x="55" y="45" width="290" height="230" rx="18" fill="#bfe3b0" fill-opacity=".35" stroke="#5b8f3a" stroke-width="10"/>
<rect x="70" y="60" width="260" height="200" rx="10" fill="none" stroke="currentColor" stroke-opacity=".7" stroke-width="2"/>
<ellipse cx="215" cy="160" rx="72" ry="82" fill="#9fd3e6" fill-opacity=".55" ${stroke} stroke-width="2" stroke-dasharray="1 0"/>
<circle cx="108" cy="112" r="28" fill="#b9a7e6" fill-opacity=".75" ${stroke} stroke-width="2.5"/>
<circle cx="115" cy="119" r="8" fill="#6a4fb3" fill-opacity=".8"/>
${chloro(105, 210, -15)}${chloro(305, 105, 25)}${chloro(305, 215, -20)}${bean(100, 245, 0, 20, 10)}`;
}

function neuron() {
  const sheath = (x) => `<rect x="${x}" y="128" width="60" height="24" rx="11" fill="#f2d16b" fill-opacity=".9" ${stroke} stroke-width="2"/>`;
  return `<g fill="none" stroke="currentColor" stroke-opacity=".8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
<path d="M80 118 L50 90 L25 85 M50 90 L40 62"/><path d="M76 130 L36 128 L14 140 M36 128 L20 112"/>
<path d="M82 160 L55 190 L30 200 M55 190 L48 222"/><path d="M105 104 L98 70 L82 50 M98 70 L116 44"/>
<path d="M146 140 L400 140 M400 140 L428 112 M400 140 L432 140 M400 140 L428 168"/></g>
<circle cx="110" cy="140" r="38" fill="#c7b6f2" fill-opacity=".8" ${stroke} stroke-width="2.5"/>
<circle cx="112" cy="138" r="14" fill="#6a4fb3" fill-opacity=".75"/>
${sheath(176)}${sheath(246)}${sheath(316)}
<g fill="#e07a9b" fill-opacity=".9" ${stroke} stroke-width="2"><circle cx="432" cy="110" r="8"/><circle cx="437" cy="140" r="8"/><circle cx="432" cy="170" r="8"/></g>`;
}

// anchor = where the arrow tip lands (inside the part); from = where the arrow starts (outside the picture)
export const BIO = {
  'animal-cell': {
    title: 'animal cell', view: [400, 320], draw: animalCell,
    parts: {
      'cell membrane': { anchor: [52, 160], from: [8, 160], blurb: 'Controls what enters and leaves the cell.', words: /cell membrane|plasma membrane/i },
      cytoplasm: { anchor: [322, 148], from: [388, 100], blurb: 'Jelly-like fluid that holds the organelles and where many reactions happen.', words: /cytoplasm|cytosol/i },
      nucleus: { anchor: [160, 122], from: [110, 18], blurb: "Holds the cell's DNA and controls the cell's activities.", words: /nucle(us|i|ar)\b/i },
      nucleolus: { anchor: [197, 160], from: [250, 300], blurb: 'Makes ribosomes inside the nucleus.', words: /nucleol/i },
      mitochondrion: { anchor: [285, 92], from: [375, 40], blurb: 'Releases energy (ATP) from food through cellular respiration.', words: /mitochondri/i },
      'rough ER': { anchor: [276, 146], from: [372, 150], blurb: 'Makes and folds proteins; its surface is covered in ribosomes.', words: /rough (er|endoplasmic)|endoplasmic reticulum/i },
      'smooth ER': { anchor: [165, 238], from: [110, 300], blurb: 'Makes lipids and breaks down harmful chemicals; it has no ribosomes.', words: /smooth (er|endoplasmic)/i },
      'Golgi apparatus': { anchor: [105, 140], from: [20, 60], blurb: 'Modifies, sorts and packages proteins for delivery.', words: /golgi/i },
      lysosome: { anchor: [300, 200], from: [380, 260], blurb: 'Breaks down waste and worn-out cell parts using enzymes.', words: /lysosom/i },
      ribosome: { anchor: [266, 236], from: [330, 305], blurb: 'Builds proteins from amino acids.', words: /ribosom/i },
      centriole: { anchor: [235, 72], from: [300, 20], blurb: 'Helps organize cell division by forming the spindle fibres.', words: /centriol|centrosome/i },
    },
  },
  'plant-cell': {
    title: 'plant cell', view: [400, 320], draw: plantCell,
    parts: {
      'cell wall': { anchor: [56, 160], from: [8, 160], blurb: 'Rigid outer layer of cellulose that supports and protects the cell.', words: /cell wall/i },
      'cell membrane': { anchor: [200, 260], from: [200, 312], blurb: 'Controls what enters and leaves the cell.', words: /cell membrane|plasma membrane/i },
      cytoplasm: { anchor: [112, 168], from: [14, 150], blurb: 'Jelly-like fluid that holds the organelles and where many reactions happen.', words: /cytoplasm|cytosol/i },
      nucleus: { anchor: [100, 104], from: [20, 40], blurb: "Holds the cell's DNA and controls the cell's activities.", words: /nucle(us|i|ar)\b/i },
      nucleolus: { anchor: [115, 119], from: [160, 35], blurb: 'Makes ribosomes inside the nucleus.', words: /nucleol/i },
      chloroplast: { anchor: [305, 105], from: [380, 40], blurb: 'Captures light energy for photosynthesis, making glucose.', words: /chloroplast/i },
      mitochondrion: { anchor: [100, 245], from: [20, 300], blurb: 'Releases energy (ATP) from food through cellular respiration.', words: /mitochondri/i },
      'central vacuole': { anchor: [225, 160], from: [385, 150], blurb: 'Stores water, nutrients and wastes, and keeps the cell firm.', words: /vacuole/i },
    },
  },
  neuron: {
    title: 'neuron', view: [480, 280], draw: neuron,
    parts: {
      dendrite: { anchor: [38, 88], from: [60, 20], blurb: 'Receives signals from other neurons.', words: /dendrite/i },
      'cell body': { anchor: [110, 172], from: [110, 262], blurb: 'Contains the nucleus and keeps the neuron alive.', words: /cell body|soma/i },
      nucleus: { anchor: [112, 136], from: [160, 40], blurb: "Holds the neuron's DNA and controls its activities.", words: /nucle(us|i|ar)\b/i },
      axon: { anchor: [162, 140], from: [165, 225], blurb: 'Carries the electrical signal away from the cell body.', words: /\baxon\b/i },
      'myelin sheath': { anchor: [207, 134], from: [207, 30], blurb: 'Insulates the axon so signals travel faster.', words: /myelin/i },
      'node of Ranvier': { anchor: [241, 140], from: [241, 235], blurb: 'A gap in the myelin where the signal jumps along the axon.', words: /ranvier|\bnodes?\b/i },
      'axon terminal': { anchor: [433, 111], from: [455, 40], blurb: 'Releases neurotransmitters to pass the signal to the next cell.', words: /axon terminal|terminal button|synaptic/i },
    },
  },
};

Object.assign(BIO, BIO2);

function arrowMarkup([sx, sy], [ax, ay]) {
  const len = Math.hypot(ax - sx, ay - sy) || 1;
  const ux = (ax - sx) / len; const uy = (ay - sy) / len;
  const bx = ax - ux * 16; const by = ay - uy * 16; // where the shaft meets the head
  const px = -uy * 7; const py = ux * 7;
  const head = `${ax},${ay} ${bx + px},${by + py} ${bx - px},${by - py}`;
  return `<g stroke-linecap="round" stroke-linejoin="round">
<line x1="${sx}" y1="${sy}" x2="${bx}" y2="${by}" style="stroke:var(--surface)" stroke-width="8" stroke-opacity=".85"/>
<polygon points="${head}" style="stroke:var(--surface)" stroke-width="5" stroke-opacity=".85" fill="${ARROW}"/>
<line x1="${sx}" y1="${sy}" x2="${bx}" y2="${by}" stroke="${ARROW}" stroke-width="4"/>
<polygon points="${head}" fill="${ARROW}" stroke="${ARROW}" stroke-width="1"/></g>`;
}

function renderBio(spec) {
  const def = BIO[spec.id];
  const part = def?.parts[spec.target];
  if (!part) throw new Error(`Unknown diagram part: ${spec.id}/${spec.target}`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${def.view[0]} ${def.view[1]}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Diagram of a ${def.title} with an arrow pointing to one part`);
  svg.innerHTML = def.draw() + arrowMarkup(part.from, part.anchor);
  return svg;
}

/* ---------------- AI-designed pictures ----------------
   The AI only supplies a list of plain shapes and the labelled points. cleanSpec() checks every number
   and drops anything unknown, so the page never draws or runs AI-written markup, and the arrow can
   only point at a spot that sits on a shape. */

const AI_W = 100; const AI_H = 70; const AI_SCALE = 4;
const FILLS = ['#9aa3b2', '#e5605a', '#f4a261', '#f2d16b', '#7bb36b', '#4ea4a0', '#6f9fcf', '#b9a7e6'];
const n = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };

function cleanShape(s) {
  if (!s || typeof s !== 'object') return null;
  const fill = Number.isInteger(s.fill) && s.fill >= 0 && s.fill < FILLS.length ? s.fill : 0;
  const get = (k, lo, hi) => n(s[k], lo, hi);
  let out = null;
  if (s.t === 'ellipse') out = { t: 'ellipse', cx: get('cx', 0, AI_W), cy: get('cy', 0, AI_H), rx: get('rx', 1, AI_W), ry: get('ry', 1, AI_H), fill };
  else if (s.t === 'circle') out = { t: 'circle', cx: get('cx', 0, AI_W), cy: get('cy', 0, AI_H), r: get('r', 1, AI_W), fill };
  else if (s.t === 'rect') out = { t: 'rect', x: get('x', 0, AI_W), y: get('y', 0, AI_H), w: get('w', 1, AI_W), h: get('h', 1, AI_H), fill };
  else if (s.t === 'line') out = { t: 'line', x1: get('x1', 0, AI_W), y1: get('y1', 0, AI_H), x2: get('x2', 0, AI_W), y2: get('y2', 0, AI_H), w: get('w', 0.5, 3) ?? 1.5, fill };
  else if (s.t === 'poly' && Array.isArray(s.pts) && s.pts.length >= 3 && s.pts.length <= 24) {
    const pts = s.pts.map((p) => (Array.isArray(p) ? [n(p[0], 0, AI_W), n(p[1], 0, AI_H)] : [null, null]));
    if (pts.every(([x, y]) => x !== null && y !== null)) out = { t: 'poly', pts, fill };
  }
  if (!out) return null;
  return Object.values(out).some((v) => v === null) ? null : out;
}

function bounds(s) {
  if (s.t === 'ellipse') return [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry];
  if (s.t === 'circle') return [s.cx - s.r, s.cy - s.r, s.cx + s.r, s.cy + s.r];
  if (s.t === 'rect') return [s.x, s.y, s.x + s.w, s.y + s.h];
  if (s.t === 'poly') { const xs = s.pts.map((p) => p[0]); const ys = s.pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  return null; // lines are not something a part can sit on
}

// Returns a safe copy of the picture, or null when it is too broken to ask a question about.
export function cleanSpec(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const shapes = (Array.isArray(raw.shapes) ? raw.shapes : []).slice(0, 40).map(cleanShape).filter(Boolean);
  if (shapes.length < 3) return null;
  const boxes = shapes.map(bounds).filter(Boolean);
  const parts = [];
  for (const p of Array.isArray(raw.parts) ? raw.parts.slice(0, 12) : []) {
    const name = typeof p?.name === 'string' ? p.name.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    const x = n(p?.x, 0, AI_W); const y = n(p?.y, 0, AI_H);
    if (name.length < 2 || x === null || y === null) continue;
    if (parts.some((q) => q.name.toLowerCase() === name.toLowerCase() || Math.hypot(q.x - x, q.y - y) < 9)) continue;
    if (!boxes.some(([x1, y1, x2, y2]) => x >= x1 - 2 && x <= x2 + 2 && y >= y1 - 2 && y <= y2 + 2)) continue; // not on any shape
    parts.push({ name, x, y, info: typeof p.info === 'string' ? p.info.replace(/\s+/g, ' ').trim().slice(0, 140) : '' });
  }
  if (parts.length < 3) return null;
  const title = typeof raw.title === 'string' ? raw.title.replace(/\s+/g, ' ').trim().slice(0, 50) : '';
  return { title: title || 'diagram', shapes, parts: parts.slice(0, 8) };
}

function aiShape(s) {
  const f = `fill="${FILLS[s.fill]}" fill-opacity=".9" stroke="currentColor" stroke-opacity=".55" stroke-width="1.6"`;
  const k = AI_SCALE;
  if (s.t === 'ellipse') return `<ellipse cx="${s.cx * k}" cy="${s.cy * k}" rx="${s.rx * k}" ry="${s.ry * k}" ${f}/>`;
  if (s.t === 'circle') return `<circle cx="${s.cx * k}" cy="${s.cy * k}" r="${s.r * k}" ${f}/>`;
  if (s.t === 'rect') return `<rect x="${s.x * k}" y="${s.y * k}" width="${s.w * k}" height="${s.h * k}" rx="4" ${f}/>`;
  if (s.t === 'line') return `<line x1="${s.x1 * k}" y1="${s.y1 * k}" x2="${s.x2 * k}" y2="${s.y2 * k}" stroke="${FILLS[s.fill]}" stroke-width="${s.w * 2}" stroke-linecap="round"/>`;
  return `<polygon points="${s.pts.map(([x, y]) => `${x * k},${y * k}`).join(' ')}" stroke-linejoin="round" ${f}/>`;
}

function renderAi(spec) {
  const clean = cleanSpec(spec);
  const part = clean?.parts[spec.target];
  if (!part) throw new Error('bad picture');
  const tip = [part.x * AI_SCALE, part.y * AI_SCALE];
  // Start the arrow at whichever spot nearby is farthest from the other labelled points.
  let from = null; let best = -1;
  for (let a = 0; a < 360; a += 20) {
    const r = (a * Math.PI) / 180;
    for (const d of [70, 90]) {
      const sx = tip[0] + Math.cos(r) * d; const sy = tip[1] + Math.sin(r) * d;
      if (sx < 8 || sx > AI_W * AI_SCALE - 8 || sy < 8 || sy > AI_H * AI_SCALE - 8) continue;
      const room = Math.min(...clean.parts.filter((p) => p !== part).map((p) => Math.hypot(p.x * AI_SCALE - sx, p.y * AI_SCALE - sy)), 999);
      if (room > best) { best = room; from = [sx, sy]; }
    }
  }
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${AI_W * AI_SCALE} ${AI_H * AI_SCALE}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Diagram of ${clean.title} with an arrow pointing to one part`);
  svg.innerHTML = clean.shapes.map(aiShape).join('') + arrowMarkup(from || [tip[0], 8], tip);
  return svg;
}

/* ---------------- entry point ---------------- */

export function renderDiagram(spec) {
  const box = document.createElement('div');
  box.className = 'diagram';
  try { box.append(spec.kind === 'graph' ? renderGraph(spec) : hasKind(spec.kind) ? renderKind(spec) : spec.kind === 'ai' ? renderAi(spec) : renderBio(spec)); }
  catch { box.textContent = '(diagram unavailable)'; }
  return box;
}
