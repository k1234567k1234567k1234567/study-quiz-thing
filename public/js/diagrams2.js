// Pictures other than graphs and the cell diagrams: free body diagrams, triangles, angles in standard
// position, mapping diagrams, Pascal's triangle, Punnett squares, pedigrees and the stages of mitosis.
// Every picture is drawn from a small spec made by the question code, so labels and numbers are exact.
const NS = 'http://www.w3.org/2000/svg';
const T = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const col = (name) => `var(--${name})`;
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 13}" text-anchor="${o.anchor || 'middle'}" font-weight="${o.bold ? 700 : 400}"${o.italic ? ' font-style="italic"' : ''} style="fill:${o.color ? col(o.color) : 'currentColor'}" paint-order="stroke" stroke="var(--surface)" stroke-width="3" stroke-linejoin="round">${T(s)}</text>`;
const line = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${o.color ? col(o.color) : 'currentColor'}" stroke-opacity="${o.op ?? 1}" stroke-width="${o.w || 2}" stroke-linecap="round"${o.dash ? ' stroke-dasharray="6 5"' : ''}/>`;

function svgOf(w, h, inner, label) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.innerHTML = inner;
  return svg;
}

function arrow(sx, sy, ax, ay, color, w = 4) {
  const len = Math.hypot(ax - sx, ay - sy) || 1;
  const ux = (ax - sx) / len; const uy = (ay - sy) / len;
  const bx = ax - ux * 13; const by = ay - uy * 13;
  const px = -uy * 6.5; const py = ux * 6.5;
  return `<g style="stroke:${col(color)};fill:${col(color)}" stroke-linecap="round"><line x1="${sx}" y1="${sy}" x2="${bx}" y2="${by}" stroke-width="${w}"/><polygon points="${ax},${ay} ${bx + px},${by + py} ${bx - px},${by - py}" stroke-width="1"/></g>`;
}

/* ---------------- mapping diagram ---------------- */

function renderMapping(spec) {
  const W = 340; const H = 60 + Math.max(spec.A.length, spec.B.length) * 38;
  const ax = 85; const bx = 255;
  const ys = (n, i) => H / 2 + (i - (n - 1) / 2) * 38;
  let s = `<ellipse cx="${ax}" cy="${H / 2}" rx="48" ry="${H / 2 - 12}" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>
<ellipse cx="${bx}" cy="${H / 2}" rx="48" ry="${H / 2 - 12}" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>`;
  s += text(ax, 14, 'Input', { size: 12, color: 'muted' }) + text(bx, 14, 'Output', { size: 12, color: 'muted' });
  for (const [i, j] of spec.pairs) s += arrow(ax + 20, ys(spec.A.length, i), bx - 24, ys(spec.B.length, j), 'primary', 2.5);
  spec.A.forEach((v, i) => { s += text(ax, ys(spec.A.length, i) + 5, v, { size: 15, bold: true }); });
  spec.B.forEach((v, j) => { s += text(bx, ys(spec.B.length, j) + 5, v, { size: 15, bold: true }); });
  return svgOf(W, H, s, 'Mapping diagram with arrows from inputs to outputs');
}

/* ---------------- free body diagram ---------------- */

const FORCE_COLOR = { gravity: 'accent', normal: 'good', friction: 'bad', applied: 'primary', tension: 'primary', other: 'primary' };

// spec.forces: [{ dir:'up'|'down'|'left'|'right', mag, name, label, unknown }]
function renderFbd(spec) {
  const W = 360; const H = 300; const cx = 180; const cy = 150; const bw = 64; const bh = 46;
  const max = Math.max(...spec.forces.map((f) => f.mag), 1);
  let s = `<rect x="${cx - bw / 2}" y="${cy - bh / 2}" width="${bw}" height="${bh}" rx="6" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-opacity=".7" stroke-width="2"/>`;
  s += text(cx, cy + 5, spec.mass ? `${spec.mass} kg` : 'box', { size: 14, bold: true });
  for (const f of spec.forces) {
    const len = 30 + 70 * (f.mag / max);
    const dx = f.dir === 'right' ? 1 : f.dir === 'left' ? -1 : 0;
    const dy = f.dir === 'down' ? 1 : f.dir === 'up' ? -1 : 0;
    const sx = cx + dx * (bw / 2) + (dx ? 0 : 0); const sy = cy + dy * (bh / 2);
    const tx = sx + dx * len; const ty = sy + dy * len;
    s += arrow(sx, sy, tx, ty, FORCE_COLOR[f.name] || 'primary', 4.5);
    const lab = f.unknown ? '?' : f.label;
    if (dy) s += text(sx + 10, (sy + ty) / 2 + 4, lab, { anchor: 'start', size: 14, bold: true });
    else s += text((sx + tx) / 2, sy - 11, lab, { size: 14, bold: true });
  }
  return svgOf(W, H, s, 'Free body diagram: a box with arrows for each force acting on it');
}

/* ---------------- triangles ---------------- */

// spec: { pts:[[x,y]x3] (y up), v:['A','B','C'], sides:[BC, CA, AB labels], angles:[at A, B, C], right: vertex index or -1, hi: side index to highlight }
function renderTriangle(spec) {
  const W = 340; const H = 270; const pad = 46;
  const xs = spec.pts.map((p) => p[0]); const ys = spec.pts.map((p) => p[1]);
  const x0 = Math.min(...xs); const y0 = Math.min(...ys);
  const k = Math.min((W - 2 * pad) / (Math.max(...xs) - x0 || 1), (H - 2 * pad) / (Math.max(...ys) - y0 || 1));
  const P = spec.pts.map(([x, y]) => [pad + (x - x0) * k + ((W - 2 * pad) - (Math.max(...xs) - x0) * k) / 2, H - pad - (y - y0) * k - ((H - 2 * pad) - (Math.max(...ys) - y0) * k) / 2]);
  const mid = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
  let s = `<polygon points="${P.map((p) => p.join(',')).join(' ')}" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>`;
  for (let i = 0; i < 3; i++) {
    const p = P[i];
    // vertex letter pushed outside, angle label pushed inside
    const out = [p[0] - mid[0], p[1] - mid[1]]; const ol = Math.hypot(...out) || 1;
    if (spec.v?.[i]) s += text(p[0] + (out[0] / ol) * 15, p[1] + (out[1] / ol) * 15 + 5, spec.v[i], { size: 15, bold: true });
    if (spec.angles?.[i]) s += text(p[0] - (out[0] / ol) * 34, p[1] - (out[1] / ol) * 34 + 4, spec.angles[i], { size: 13, color: 'accent', bold: true });
    if (spec.right === i) {
      const a = P[(i + 1) % 3]; const b = P[(i + 2) % 3];
      const ua = [(a[0] - p[0]), (a[1] - p[1])]; const la = Math.hypot(...ua);
      const ub = [(b[0] - p[0]), (b[1] - p[1])]; const lb = Math.hypot(...ub);
      const sq = 13;
      const p1 = [p[0] + ua[0] / la * sq, p[1] + ua[1] / la * sq]; const p2 = [p[0] + ub[0] / lb * sq, p[1] + ub[1] / lb * sq];
      s += `<polyline points="${p1.join(',')} ${[p1[0] + ub[0] / lb * sq, p1[1] + ub[1] / lb * sq].join(',')} ${p2.join(',')}" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
    }
  }
  // side i is opposite vertex i
  for (let i = 0; i < 3; i++) {
    if (!spec.sides?.[i]) continue;
    const a = P[(i + 1) % 3]; const b = P[(i + 2) % 3];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const out = [m[0] - mid[0], m[1] - mid[1]]; const ol = Math.hypot(...out) || 1;
    if (spec.hi === i) s += line(a[0], a[1], b[0], b[1], { color: 'primary', w: 4.5 });
    s += text(m[0] + (out[0] / ol) * 17, m[1] + (out[1] / ol) * 17 + 5, spec.sides[i], { size: 14, bold: true, color: spec.hi === i ? 'primary' : undefined });
  }
  return svgOf(W, H, s, 'Triangle with labelled sides and angles');
}

/* ---------------- angle in standard position / unit circle ---------------- */

// spec: { R, P:[x,y], theta, pointLabel, unit, arrow }
function renderAngle(spec) {
  const S = 320; const c = S / 2; const half = c - 26;
  const R = spec.R;
  const k = half / R;
  const sx = (x) => c + x * k; const sy = (y) => c - y * k;
  let s = '';
  for (let v = -Math.floor(R); v <= R; v++) {
    s += `<line x1="${sx(v)}" y1="${sy(-R)}" x2="${sx(v)}" y2="${sy(R)}" stroke="currentColor" stroke-opacity=".1"/><line x1="${sx(-R)}" y1="${sy(v)}" x2="${sx(R)}" y2="${sy(v)}" stroke="currentColor" stroke-opacity=".1"/>`;
    if (!spec.unit && v !== 0 && Math.abs(v) % (R > 8 ? 2 : 1) === 0) s += text(sx(v), sy(0) + 13, v, { size: 9, color: 'muted' }) + text(sx(0) - 5, sy(v) + 3, v, { size: 9, anchor: 'end', color: 'muted' });
  }
  s += line(sx(-R), sy(0), sx(R), sy(0), { op: 0.75, w: 1.5 }) + line(sx(0), sy(-R), sx(0), sy(R), { op: 0.75, w: 1.5 });
  s += text(sx(R) - 2, sy(0) - 6, 'x', { italic: true, anchor: 'end' }) + text(sx(0) + 8, sy(R) + 4, 'y', { italic: true, anchor: 'start' });
  const [px, py] = spec.P;
  const r = Math.hypot(px, py);
  if (spec.unit) s += `<circle cx="${sx(0)}" cy="${sy(0)}" r="${k}" fill="none" stroke="currentColor" stroke-opacity=".55" stroke-width="2"/>`;
  s += line(sx(0), sy(0), sx(px), sy(py), { color: 'primary', w: 3.5 });
  // arc for the angle, drawn counterclockwise from the positive x-axis
  const arcR = Math.min(0.32 * r, spec.unit ? 0.3 : 1.6) * k + 6;
  const steps = 48; let arc = '';
  for (let i = 0; i <= steps; i++) {
    const a = (spec.theta * i / steps) * Math.PI / 180;
    arc += `${i ? 'L' : 'M'}${(sx(0) + Math.cos(a) * arcR).toFixed(1)} ${(sy(0) - Math.sin(a) * arcR).toFixed(1)} `;
  }
  s += `<path d="${arc}" fill="none" style="stroke:${col('accent')}" stroke-width="2.5"/>`;
  const mid = (spec.theta / 2) * Math.PI / 180;
  s += text(sx(0) + Math.cos(mid) * (arcR + 15), sy(0) - Math.sin(mid) * (arcR + 15) + 4, spec.thetaLabel || 'θ', { size: 14, bold: true, color: 'accent' });
  s += `<circle cx="${sx(px)}" cy="${sy(py)}" r="5.5" style="fill:${col('primary')};stroke:var(--surface)" stroke-width="2"/>`;
  if (spec.pointLabel) {
    const left = px < 0 && sx(px) > 96; // plenty of room on the left; otherwise write the label to the right
    const lx = sx(px) + (left ? -9 : px >= 0 && sx(px) > S - 86 ? -9 : 9);
    const anchor = left || (px >= 0 && sx(px) > S - 86) ? 'end' : 'start';
    s += text(lx, sy(py) + (py >= 0 ? -9 : 17), spec.pointLabel, { size: 13, bold: true, anchor });
  }
  if (spec.arrow) {
    const dx = sx(px) - c; const dy = sy(py) - c; const l = Math.hypot(dx, dy) || 1;
    const bx = sx(px) + (dx / l) * 52; const by = sy(py) + (dy / l) * 52;
    s += arrow(bx, by, sx(px) + (dx / l) * 7, sy(py) + (dy / l) * 7, 'bad', 4);
  }
  return svgOf(S, S, s, 'Angle in standard position on a coordinate grid');
}

/* ---------------- ambiguous case of the sine law ---------------- */

// spec: { A (deg), b, a }  A at the origin, side b to C, side a swings from C to the base line
function renderAmbig(spec) {
  const A = (spec.A * Math.PI) / 180;
  const C = [spec.b * Math.cos(A), spec.b * Math.sin(A)];
  const disc = spec.a * spec.a - C[1] * C[1];
  const Bs = disc >= 0 ? [C[0] - Math.sqrt(disc), C[0] + Math.sqrt(disc)].filter((x) => x > 1e-9).filter((x, i, arr) => arr.indexOf(x) === i && (i === 0 || Math.abs(x - arr[0]) > 1e-9)) : [];
  const W = 360; const H = 250; const pad = 34;
  const maxX = Math.max(C[0] + spec.a, ...Bs, spec.b) * 1.05; const maxY = Math.max(C[1] + 0.2, 1);
  const k = Math.min((W - 2 * pad) / maxX, (H - 2 * pad) / (Math.max(maxY, spec.a * 0.6)));
  const ox = pad; const oy = H - pad - 10;
  const X = (x) => ox + x * k; const Y = (y) => oy - y * k;
  let s = line(ox - 10, oy, X(maxX), oy, { op: 0.7, w: 2 });
  s += line(X(0), Y(0), X(C[0]), Y(C[1]), { w: 3 });
  s += `<clipPath id="amb${spec.a}-${spec.b}"><rect x="0" y="${Y(maxY + spec.a)}" width="${W}" height="${oy - Y(maxY + spec.a)}"/></clipPath><circle clip-path="url(#amb${spec.a}-${spec.b})" cx="${X(C[0])}" cy="${Y(C[1])}" r="${spec.a * k}" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-dasharray="5 5" stroke-width="2"/>`;
  Bs.forEach((x, i) => {
    s += line(X(C[0]), Y(C[1]), X(x), Y(0), { color: i ? 'bad' : 'primary', w: 3.5 });
    s += `<circle cx="${X(x)}" cy="${Y(0)}" r="4.5" style="fill:${col(i ? 'bad' : 'primary')}"/>`;
  });
  s += `<circle cx="${X(C[0])}" cy="${Y(C[1])}" r="4.5" fill="currentColor"/>` + text(X(C[0]), Y(C[1]) - 10, 'C', { bold: true, size: 15 }) + text(X(0) - 4, oy + 18, 'A', { bold: true, size: 15 });
  const arcR = 26; let arc = '';
  for (let i = 0; i <= 24; i++) { const t = (A * i) / 24; arc += `${i ? 'L' : 'M'}${(X(0) + Math.cos(t) * arcR).toFixed(1)} ${(Y(0) - Math.sin(t) * arcR).toFixed(1)} `; }
  s += `<path d="${arc}" fill="none" style="stroke:${col('accent')}" stroke-width="2.5"/>` + text(X(0) + 44, Y(0) - 8, `${spec.A}°`, { color: 'accent', bold: true });
  s += text(X(C[0] / 2) - 14, Y(C[1] / 2) - 10, `b = ${spec.b}`, { bold: true });
  s += text(X(C[0]) + 6, Y(C[1] / 2) + 4, `a = ${spec.a}`, { anchor: 'start', bold: true, color: 'primary' });
  return svgOf(W, H, s, 'Angle A, side b and side a swinging down to the base line');
}

/* ---------------- Pascal's triangle ---------------- */

function renderPascal(spec) {
  const rows = spec.rows; const W = 340; const dx = 40; const dy = 34; const H = 40 + rows * dy;
  let s = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= r; c++) {
      const v = (spec.values[r][c]);
      const x = W / 2 + (c - r / 2) * dx; const y = 28 + r * dy;
      const hidden = spec.hide && spec.hide[0] === r && spec.hide[1] === c;
      if (hidden) s += `<circle cx="${x}" cy="${y - 5}" r="15" style="fill:${col('surface')};stroke:${col('accent')}" stroke-width="2.5"/>` + text(x, y, '?', { bold: true, size: 17, color: 'accent' });
      else s += text(x, y, v, { size: 15 });
    }
  }
  return svgOf(W, H, s, "Pascal's triangle with one number missing");
}

/* ---------------- Punnett square ---------------- */

// spec: { top:[..], left:[..], cells:[[..]], hide:[r,c] }
function renderPunnett(spec) {
  const n = spec.top.length; const cell = n > 2 ? 58 : 76; const W = 60 + n * cell + 10; const H = 50 + spec.left.length * cell + 10;
  let s = '';
  spec.top.forEach((g, i) => { s += text(60 + i * cell + cell / 2, 32, g, { bold: true, size: 14, color: 'primary' }); });
  spec.left.forEach((g, j) => { s += text(30, 50 + j * cell + cell / 2 + 5, g, { bold: true, size: 14, color: 'primary' }); });
  spec.left.forEach((_, j) => spec.top.forEach((__, i) => {
    const x = 60 + i * cell; const y = 50 + j * cell;
    const hid = spec.hide && spec.hide[0] === j && spec.hide[1] === i;
    s += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${hid ? 'var(--accent)' : 'none'}" fill-opacity="${hid ? 0.18 : 0}" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>`;
    s += text(x + cell / 2, y + cell / 2 + 5, hid ? '?' : spec.cells[j][i], { size: n > 2 ? 13 : 16, bold: true, color: hid ? 'accent' : undefined });
  }));
  return svgOf(W, H, s, 'Punnett square');
}

/* ---------------- pedigree ---------------- */

// spec: { parents:[{sex, affected}, {sex, affected}], kids:[{sex, affected}], mark: index of child with the arrow }
function renderPedigree(spec) {
  const W = 340; const H = 268;
  const sym = (x, y, p, extra = '') => {
    const fill = p.affected ? 'currentColor' : 'none';
    const shape = p.sex === 'M'
      ? `<rect x="${x - 17}" y="${y - 17}" width="34" height="34" fill="${fill}" fill-opacity="${p.affected ? 0.85 : 0}" stroke="currentColor" stroke-width="2.5"/>`
      : `<circle cx="${x}" cy="${y}" r="18" fill="${fill}" fill-opacity="${p.affected ? 0.85 : 0}" stroke="currentColor" stroke-width="2.5"/>`;
    return shape + extra;
  };
  const px = [110, 230]; const py = 52;
  let s = line(px[0] + 18, py, px[1] - 18, py, { w: 2.5 });
  const kids = spec.kids; const gap = Math.min(64, 260 / Math.max(kids.length, 1));
  const kx = kids.map((_, i) => W / 2 + (i - (kids.length - 1) / 2) * gap);
  const ky = 170; const bar = 112;
  s += line(W / 2, py, W / 2, bar, { w: 2.5 }) + line(kx[0], bar, kx[kx.length - 1], bar, { w: 2.5 });
  kids.forEach((k, i) => { s += line(kx[i], bar, kx[i], ky - 19, { w: 2.5 }) + sym(kx[i], ky, k); });
  spec.parents.forEach((p, i) => { s += sym(px[i], py, p); });
  s += text(24, py + 5, 'I', { bold: true, color: 'muted' }) + text(24, ky + 5, 'II', { bold: true, color: 'muted' });
  if (spec.mark != null) s += arrow(kx[spec.mark], ky + 66, kx[spec.mark], ky + 23, 'bad', 4);
  s += text(W / 2, H - 6, 'Shaded = shows the trait', { size: 11, color: 'muted' });
  return svgOf(W, H, s, 'Pedigree chart: squares are males, circles are females, shaded shapes show the trait');
}

/* ---------------- mitosis stages ---------------- */

const chrom = (x, y, rot = 0, big = true) => `<g transform="rotate(${rot} ${x} ${y})" stroke-linecap="round" style="stroke:${col('primary')}" stroke-width="${big ? 5 : 4}"><line x1="${x - 8}" y1="${y - 10}" x2="${x + 8}" y2="${y + 10}"/><line x1="${x + 8}" y1="${y - 10}" x2="${x - 8}" y2="${y + 10}"/></g>`;
const chromatid = (x, y, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})" stroke-linecap="round" style="stroke:${col('primary')}" stroke-width="4.5"><line x1="${x - 8}" y1="${y - 10}" x2="${x}" y2="${y + 2}"/><line x1="${x + 8}" y1="${y - 10}" x2="${x}" y2="${y + 2}"/><line x1="${x}" y1="${y + 2}" x2="${x}" y2="${y + 11}"/></g>`;
const fibre = (x1, y1, x2, y2) => line(x1, y1, x2, y2, { w: 1.6, op: 0.45 });
const cellShell = '<ellipse cx="170" cy="130" rx="130" ry="100" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/>';

function renderMitosis(spec) {
  let s = '';
  const stage = spec.stage;
  if (stage === 'interphase') {
    s = cellShell + `<circle cx="170" cy="130" r="58" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/><circle cx="182" cy="140" r="13" style="fill:${col('accent')}" fill-opacity=".7"/>`;
    for (const [x, y] of [[150, 108], [165, 118], [140, 130], [158, 148], [190, 112], [200, 128], [152, 160], [176, 100]]) s += `<path d="M${x} ${y} q8 -10 14 0 t12 4" fill="none" style="stroke:${col('primary')}" stroke-width="3" stroke-linecap="round"/>`;
  } else if (stage === 'prophase') {
    s = cellShell + `<circle cx="170" cy="130" r="66" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="2.5" stroke-dasharray="8 7"/>`;
    for (const [x, y, r] of [[145, 110, 20], [185, 105, -30], [160, 140, 60], [195, 145, 10], [150, 165, -10]]) s += chrom(x, y, r);
    s += `<rect x="164" y="40" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/><rect x="164" y="211" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/>`;
    s += fibre(170, 49, 150, 100) + fibre(170, 49, 195, 98) + fibre(170, 211, 155, 160) + fibre(170, 211, 190, 165);
  } else if (stage === 'metaphase') {
    s = cellShell + `<rect x="164" y="40" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/><rect x="164" y="211" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/>`;
    const px = [100, 135, 170, 205, 240];
    for (const x of px) s += fibre(170, 49, x, 121) + fibre(170, 211, x, 139) + chrom(x, 130, 0);
    s += line(80, 130, 260, 130, { dash: true, w: 1.5, op: 0.4 });
  } else if (stage === 'anaphase') {
    s = '<ellipse cx="170" cy="130" rx="136" ry="96" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/>';
    s += `<rect x="164" y="40" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/><rect x="164" y="211" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/>`;
    [[150, 82], [185, 78], [165, 98], [145, 100], [190, 98]].forEach(([x, y]) => { s += fibre(170, 49, x, y - 8) + chromatid(x, y, 0); });
    [[150, 178], [185, 182], [165, 162], [145, 160], [190, 162]].forEach(([x, y]) => { s += fibre(170, 211, x, y + 8) + chromatid(x, y, 180); });
  } else {
    s = '<path d="M50 130 C50 60 120 38 168 54 C175 70 175 90 170 106 L170 154 C175 170 175 190 168 206 C120 222 50 200 50 130 Z" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/>';
    s = `<path d="M170 52 C120 34 40 60 40 130 C40 200 120 226 170 208 C220 226 300 200 300 130 C300 60 220 34 170 52 Z" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/><path d="M170 52 C158 90 158 170 170 208 C182 170 182 90 170 52 Z" fill="var(--surface)" stroke="currentColor" stroke-opacity=".7" stroke-width="2.5"/>`;
    for (const cx of [100, 240]) {
      s += `<circle cx="${cx}" cy="130" r="40" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5"/>`;
      for (const [dx, dy] of [[-14, -14], [8, -16], [-8, 2], [14, 8], [-16, 16], [4, 20]]) s += `<path d="M${cx + dx} ${cy(dy)} q6 -8 11 0 t9 3" fill="none" style="stroke:${col('primary')}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  return svgOf(340, 260, s, 'A dividing cell');
}
const cy = (dy) => 130 + dy;


/* ---------------- simple circuits ---------------- */

// spec: { mode:'series'|'parallel', V, R:[ohms], unknown: index of the resistor labelled "?" }
function renderCircuit(spec) {
  const W = 360; const H = 250;
  const n = spec.R.length;
  const label = (i) => (spec.unknown === i ? '? Ω' : `${spec.R[i]} Ω`);
  const wire = (x1, y1, x2, y2) => line(x1, y1, x2, y2, { w: 2.5 });
  const resH = (cx, cy, i) => `<rect x="${cx - 30}" y="${cy - 12}" width="60" height="24" rx="3" style="fill:var(--surface);stroke:${col('primary')}" stroke-width="2.5"/>` + text(cx, cy + 5, label(i), { size: 13, bold: true });
  const resV = (cx, cy, i) => `<rect x="${cx - 24}" y="${cy - 26}" width="48" height="52" rx="3" style="fill:var(--surface);stroke:${col('primary')}" stroke-width="2.5"/>` + text(cx, cy + 5, label(i), { size: 13, bold: true });
  // battery on the left: long line = positive terminal
  const bx = 78;
  let s = wire(bx, 40, bx, 108) + wire(bx, 124, bx, 210)
    + line(bx - 18, 108, bx + 18, 108, { w: 3.5 }) + line(bx - 9, 120, bx + 9, 120, { w: 3.5 })
    + text(bx - 24, 118, `${spec.V} V`, { anchor: 'end', size: 14, bold: true, color: 'accent' }) + text(bx + 24, 112, '+', { anchor: 'start', size: 13 });
  if (spec.mode === 'series') {
    const xs = Array.from({ length: n }, (_, i) => 120 + ((i + 0.5) * (W - 120 - 30)) / n);
    s += wire(bx, 40, 120, 40) + wire(W - 30, 40, W - 30, 210) + wire(bx, 210, W - 30, 210);
    let prev = 120;
    xs.forEach((x, i) => { s += wire(prev, 40, x - 30, 40) + resH(x, 40, i); prev = x + 30; });
    s += wire(prev, 40, W - 30, 40);
  } else {
    const xs = Array.from({ length: n }, (_, i) => 130 + ((i + 0.5) * (W - 130 - 30)) / n);
    s += wire(bx, 40, W - 30, 40) + wire(bx, 210, W - 30, 210);
    xs.forEach((x, i) => { s += wire(x, 40, x, 124 - 26) + resV(x, 124, i) + wire(x, 124 + 26, x, 210); });
  }
  return svgOf(W, H, s, `A ${spec.mode} circuit with a battery and ${n} resistors`);
}


/* ---------------- meiosis stages ---------------- */

const VIO = col('primary'); const AMB = col('accent');
const xs = (x, y, color, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})" stroke-linecap="round" style="stroke:${color}" stroke-width="5"><line x1="${x - 7}" y1="${y - 10}" x2="${x + 7}" y2="${y + 10}"/><line x1="${x + 7}" y1="${y - 10}" x2="${x - 7}" y2="${y + 10}"/></g>`;
const vee = (x, y, color, up) => `<g stroke-linecap="round" stroke-linejoin="round" fill="none" style="stroke:${color}" stroke-width="4.5"><path d="M${x - 8} ${y + (up ? 10 : -10)} L${x} ${y + (up ? -8 : 8)} L${x + 8} ${y + (up ? 10 : -10)}"/></g>`;
const rod = (x, y, color) => `<line x1="${x}" y1="${y - 9}" x2="${x}" y2="${y + 9}" stroke-linecap="round" style="stroke:${color}" stroke-width="5"/>`;
const oval = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/>`;
const pole = (x, y) => `<rect x="${x - 6}" y="${y - 4}" width="12" height="9" rx="2" fill="currentColor" fill-opacity=".7"/>`;

function renderMeiosis(spec) {
  let s = '';
  const st = spec.stage;
  if (st === 'prophase1') {
    s = oval(170, 130, 130, 100) + `<circle cx="170" cy="130" r="72" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="2.5" stroke-dasharray="8 7"/>`;
    for (const [x, y] of [[145, 108], [195, 118], [160, 160]]) s += xs(x - 7, y, VIO, 10) + xs(x + 7, y, AMB, -10);
    s += pole(170, 40) + pole(170, 215);
  } else if (st === 'metaphase1') {
    s = oval(170, 130, 130, 100) + pole(170, 40) + pole(170, 215);
    for (const x of [120, 170, 220]) s += fibre(170, 44, x, 118 - 10) + fibre(170, 212, x, 142 + 10) + xs(x, 118, VIO) + xs(x, 142, AMB);
  } else if (st === 'anaphase1') {
    s = oval(170, 130, 136, 100) + pole(170, 40) + pole(170, 215);
    for (const x of [130, 170, 210]) s += fibre(170, 44, x, 80) + fibre(170, 212, x, 182) + xs(x, 88, x === 170 ? AMB : VIO) + xs(x, 176, x === 170 ? VIO : AMB);
  } else if (st === 'metaphase2') {
    s = oval(96, 130, 72, 86) + oval(244, 130, 72, 86);
    for (const cx of [96, 244]) { s += line(cx - 40, 130, cx + 40, 130, { dash: true, w: 1.5, op: 0.4 }) + xs(cx - 20, 130, VIO) + xs(cx + 20, 130, AMB); s += pole(cx, 54) + pole(cx, 204) + fibre(cx, 58, cx - 20, 118) + fibre(cx, 58, cx + 20, 118) + fibre(cx, 200, cx - 20, 142) + fibre(cx, 200, cx + 20, 142); }
  } else if (st === 'anaphase2') {
    s = oval(96, 130, 72, 90) + oval(244, 130, 72, 90);
    for (const cx of [96, 244]) { s += pole(cx, 50) + pole(cx, 208); for (const dx of [-20, 20]) s += fibre(cx, 54, cx + dx, 92) + fibre(cx, 204, cx + dx, 170) + vee(cx + dx, 94, dx < 0 ? VIO : AMB, false) + vee(cx + dx, 168, dx < 0 ? VIO : AMB, true); }
  } else {
    for (const [cx, cy] of [[90, 74], [250, 74], [90, 188], [250, 188]]) s += `<circle cx="${cx}" cy="${cy}" r="48" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/>` + rod(cx - 8, cy, cy > 100 ? AMB : VIO) + rod(cx + 8, cy, cx > 150 ? AMB : VIO);
  }
  return svgOf(340, 260, s, 'A cell in meiosis');
}

/* ---------------- cell cycle ring ---------------- */

const CYCLE = [['G1', 0.42, '#6f9fcf'], ['S', 0.28, '#7bb36b'], ['G2', 0.18, '#f2d16b'], ['M', 0.12, '#e5605a']];
function renderCycle(spec) {
  const c = 170; const R = 100; const r = 58;
  let s = ''; let a0 = -Math.PI / 2;
  const pt = (rad, a) => [c + Math.cos(a) * rad, 130 + Math.sin(a) * rad];
  CYCLE.forEach(([name, frac, color], i) => {
    const a1 = a0 + frac * Math.PI * 2;
    const [x1, y1] = pt(R, a0); const [x2, y2] = pt(R, a1); const [x3, y3] = pt(r, a1); const [x4, y4] = pt(r, a0);
    const big = frac > 0.5 ? 1 : 0;
    const hi = spec.hide === i;
    s += `<path d="M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${big} 0 ${x4} ${y4} Z" fill="${color}" fill-opacity="${hi ? 0.35 : 0.9}" stroke="var(--surface)" stroke-width="3"/>`;
    const mid = (a0 + a1) / 2; const [lx, ly] = pt((R + r) / 2, mid);
    s += text(lx, ly + 5, hi ? '?' : name, { bold: true, size: hi ? 22 : 15, color: hi ? 'accent' : undefined });
    a0 = a1;
  });
  s += text(c, 126, 'Cell', { size: 13, color: 'muted' }) + text(c, 144, 'cycle', { size: 13, color: 'muted' });
  s += arrow(c + 4, 130 - R - 14, c + 38, 130 - R - 14, 'muted', 2.5);
  return svgOf(340, 270, s, 'The cell cycle drawn as a ring of phases');
}

/* ---------------- taxonomy levels ---------------- */

export const TAXA = ['Domain', 'Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species'];
function renderTaxon(spec) {
  const W = 340; const H = 30 + TAXA.length * 32;
  let s = '';
  TAXA.forEach((t, i) => {
    const w = 290 - i * 28; const x = (W - w) / 2; const y = 12 + i * 32;
    const hid = spec.hide === i;
    s += `<rect x="${x}" y="${y}" width="${w}" height="26" rx="6" style="fill:${hid ? 'var(--surface)' : col('primary')};stroke:${hid ? col('accent') : 'none'}" fill-opacity="${hid ? 1 : 0.18 + i * 0.09}" stroke-width="2.5"/>`;
    s += text(W / 2, y + 18, hid ? '?' : t, { bold: true, size: 14, color: hid ? 'accent' : undefined });
  });
  return svgOf(W, H, s, 'The levels of biological classification from broadest to most specific');
}

/* ---------------- karyotype ---------------- */

// spec: { counts:[22 numbers (copies of each autosome)], sex:['X','X'] }
function renderKaryotype(spec) {
  const cols = 6; const cw = 54; const ch = 70; const W = cols * cw + 10; const rows = 4; const H = rows * ch + 12;
  let s = '';
  const groups = [...spec.counts.map((n, i) => ({ n, label: String(i + 1), h: 46 - i * 1.4 })), ...[{ n: spec.sex.length, label: 'X/Y', sexes: spec.sex }]];
  groups.forEach((g, i) => {
    const gx = 5 + (i % cols) * cw; const gy = 6 + Math.floor(i / cols) * ch;
    const n = g.n; const gap = 11; const x0 = gx + cw / 2 - ((n - 1) * gap) / 2;
    for (let k = 0; k < n; k++) {
      const hh = g.sexes ? (g.sexes[k] === 'Y' ? 16 : 34) : g.h;
      s += `<rect x="${x0 + k * gap - 3.5}" y="${gy + 44 - hh}" width="7" height="${hh}" rx="3.5" style="fill:${col('primary')}" fill-opacity="${g.sexes ? 0.95 : 0.85}"/>`;
      if (g.sexes) s += text(x0 + k * gap, gy + 44 + 0, '', {});
    }
    s += text(gx + cw / 2, gy + 62, g.sexes ? spec.sex.join('') : g.label, { size: 11, color: 'muted' });
  });
  return svgOf(W, H, s, 'A karyotype: the chromosomes arranged in numbered pairs');
}

/* ---------------- homologous pairs ---------------- */

function renderHomologs(spec) {
  const n = spec.pairs; let s = oval(170, 110, 142, 86);
  for (let i = 0; i < n; i++) { const x = 170 + (i - (n - 1) / 2) * 56; s += xs(x - 9, 110, VIO, 8) + xs(x + 9, 110, AMB, -8); }
  return svgOf(340, 220, s, 'A cell with pairs of homologous chromosomes');
}



/* ---------------- plant groups key, leaves, body symmetry, bacteria shapes ---------------- */

export const PLANT_GROUPS = ['Bryophytes', 'Seedless vascular plants', 'Gymnosperms', 'Angiosperms'];
const PLANT_SHORT = ['Bryophytes', 'Ferns', 'Gymnosperms', 'Angiosperms'];
function renderPlantKey(spec) {
  const W = 340; const H = 292;
  const box = (x, y, w, h, label, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" style="fill:${o.hid || !o.leaf ? 'var(--surface)' : col('primary')};stroke:${o.hid ? col('accent') : o.leaf ? 'none' : col('muted')}" fill-opacity="${o.leaf && !o.hid ? 0.3 : 1}" stroke-width="2.5"/>` + text(x + w / 2, y + h / 2 + 5, label, { size: o.size || 13, bold: true, color: o.hid ? 'accent' : undefined });
  const lab = (i) => (spec.hide === i ? '?' : PLANT_SHORT[i]);
  let s = box(95, 8, 150, 40, 'Vascular tissue?');
  s += line(145, 48, 66, 96, { w: 2.5 }) + line(195, 48, 251, 96, { w: 2.5 }) + text(92, 66, 'No', { size: 12, color: 'muted' }) + text(238, 66, 'Yes', { size: 12, color: 'muted' });
  s += box(14, 96, 104, 36, lab(0), { leaf: true, hid: spec.hide === 0 });
  s += box(176, 96, 150, 40, 'Makes seeds?');
  s += line(225, 136, 120, 186, { w: 2.5 }) + line(277, 136, 261, 186, { w: 2.5 }) + text(158, 154, 'No', { size: 12, color: 'muted' }) + text(286, 160, 'Yes', { size: 12, color: 'muted' });
  s += box(70, 186, 100, 36, lab(1), { leaf: true, hid: spec.hide === 1 });
  s += box(196, 186, 130, 40, 'Flowers & fruit?', { size: 12 });
  s += line(240, 226, 188, 252, { w: 2.5 }) + line(282, 226, 295, 252, { w: 2.5 }) + text(200, 240, 'No', { size: 12, color: 'muted' }) + text(300, 242, 'Yes', { size: 12, color: 'muted' });
  s += box(140, 252, 96, 32, lab(2), { leaf: true, hid: spec.hide === 2, size: 12 }) + box(250, 252, 88, 32, lab(3), { leaf: true, hid: spec.hide === 3, size: 12 });
  return svgOf(W, H, s, 'A key that sorts plants into four groups');
}

// monocot: long narrow leaf with parallel veins; dicot: broad leaf with a midrib and branching veins
function renderLeaf(spec) {
  let s = '';
  if (spec.type === 'monocot') {
    s += `<path d="M40 130 C120 70 260 70 320 130 C260 190 120 190 40 130 Z" fill="#7bb36b" fill-opacity=".75" ${'stroke="currentColor" stroke-opacity=".6"'} stroke-width="2.5"/>`;
    for (const dy of [-34, -20, -8, 0, 8, 20, 34]) s += `<path d="M52 ${130 + dy * 0.3} C130 ${130 + dy} 230 ${130 + dy} 306 ${130 + dy * 0.3}" fill="none" stroke="#2f7d3a" stroke-width="2" stroke-opacity=".9"/>`;
  } else {
    s += `<path d="M180 30 C290 60 310 170 180 232 C50 170 70 60 180 30 Z" fill="#7bb36b" fill-opacity=".75" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5"/>`;
    s += '<path d="M180 232 L180 40" stroke="#2f7d3a" stroke-width="3.5" fill="none"/>';
    for (const y of [70, 100, 130, 160, 190]) s += `<path d="M180 ${y + 16} Q${130} ${y + 4} ${96 + (y - 70) * 0.18} ${y - 12}" stroke="#2f7d3a" stroke-width="2" fill="none"/><path d="M180 ${y + 16} Q${230} ${y + 4} ${264 - (y - 70) * 0.18} ${y - 12}" stroke="#2f7d3a" stroke-width="2" fill="none"/>`;
    for (const y of [80, 120, 160]) s += `<path d="M${150} ${y + 2} l-16 10 M${210} ${y + 2} l16 10" stroke="#2f7d3a" stroke-width="1.4" fill="none"/>`;
  }
  return svgOf(360, 260, s, `A leaf with ${spec.type === 'monocot' ? 'parallel' : 'branching'} veins`);
}

function renderSymmetry(spec) {
  let s = '';
  if (spec.type === 'asymmetrical') {
    s += `<path d="M120 70 C170 20 250 50 240 110 C300 120 300 190 230 200 C220 250 140 250 130 200 C70 210 50 140 100 120 C80 100 90 80 120 70 Z" fill="#e07a9b" fill-opacity=".6" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/>`;
    for (const [x, y] of [[150, 100], [200, 150], [130, 170], [220, 90], [180, 200]]) s += `<circle cx="${x}" cy="${y}" r="9" fill="var(--surface)" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>`;
  } else if (spec.type === 'radial') {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 36 : 100; pts.push(`${180 + Math.cos(a) * r},${130 + Math.sin(a) * r}`); }
    s += `<polygon points="${pts.join(' ')}" fill="#f4a261" fill-opacity=".85" stroke="currentColor" stroke-opacity=".7" stroke-width="3" stroke-linejoin="round"/><circle cx="180" cy="130" r="14" fill="#e5605a" fill-opacity=".85"/>`;
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; s += `<line x1="180" y1="130" x2="${180 + Math.cos(a) * 80}" y2="${130 + Math.sin(a) * 80}" stroke="#8a6d3b" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>`; }
  } else if (spec.type === 'bilateral') {
    s += `<path d="M180 30 C215 60 250 70 300 110 C250 130 235 150 235 190 C235 230 210 250 180 262 C150 250 125 230 125 190 C125 150 110 130 60 110 C110 70 145 60 180 30 Z" fill="#6f9fcf" fill-opacity=".7" stroke="currentColor" stroke-opacity=".7" stroke-width="3" stroke-linejoin="round"/>`;
    s += '<circle cx="165" cy="80" r="6" fill="var(--surface)"/><circle cx="195" cy="80" r="6" fill="var(--surface)"/>';
  } else {
    s += `<circle cx="180" cy="130" r="92" fill="#9fd3e6" fill-opacity=".6" stroke="currentColor" stroke-opacity=".7" stroke-width="3"/><circle cx="180" cy="130" r="30" fill="#b9a7e6" fill-opacity=".85" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>`;
  }
  return svgOf(360, 270, s, 'An animal body plan');
}

function renderBactShape(spec) {
  const kind = spec.shape; const ar = spec.arrange;
  const c = (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="#e5605a" fill-opacity=".8" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>`;
  const r = (x, y, rot = 0) => `<rect x="${x - 26}" y="${y - 11}" width="52" height="22" rx="11" transform="rotate(${rot} ${x} ${y})" fill="#6f9fcf" fill-opacity=".85" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>`;
  let s = '';
  if (kind === 'spirillum') {
    s += '<path d="M40 130 q20 -50 40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#7bb36b" stroke-width="14" stroke-linecap="round"/>';
  } else if (kind === 'coccus') {
    if (ar === 'single') s += c(180, 130);
    else if (ar === 'pairs') s += c(160, 130) + c(196, 130);
    else if (ar === 'chain') for (let i = 0; i < 5; i++) s += c(88 + i * 46, 130);
    else for (const [x, y] of [[150, 100], [186, 100], [168, 134], [132, 134], [204, 134], [150, 168], [186, 168]]) s += c(x, y);
  } else {
    if (ar === 'single') s += r(180, 130);
    else if (ar === 'pairs') s += r(180, 105) + r(180, 150);
    else if (ar === 'chain') for (let i = 0; i < 4; i++) s += r(180, 50 + i * 40);
    else for (const [x, y, rot] of [[150, 100, 20], [200, 110, -30], [170, 150, 80], [215, 160, 10], [130, 150, -20]]) s += r(x, y, rot);
  }
  return svgOf(360, 260, s, 'Bacteria under a microscope');
}


/* ---------------- shapes with algebraic or radical sides ---------------- */

function renderShape(spec) {
  const W = 360; const H = 250; let s = '';
  if (spec.shape === 'rect') {
    s += `<rect x="60" y="56" width="240" height="130" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="3"/>`;
    s += text(180, 42, spec.w, { bold: true, size: 15 }) + text(312, 126, spec.h, { bold: true, size: 15, anchor: 'start' });
  } else if (spec.shape === 'square') {
    s += `<rect x="105" y="50" width="150" height="150" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="3"/>`;
    s += text(180, 38, spec.s, { bold: true, size: 15 }) + text(268, 130, spec.s, { bold: true, size: 15, anchor: 'start' });
    s += '<g stroke="currentColor" stroke-width="2.5"><line x1="180" y1="44" x2="180" y2="56"/><line x1="249" y1="125" x2="261" y2="125"/></g>';
  } else if (spec.shape === 'circle') {
    s += `<circle cx="180" cy="125" r="92" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="3"/><circle cx="180" cy="125" r="4" fill="currentColor"/>`;
    s += line(180, 125, 272, 125, { color: 'primary', w: 3.5 }) + text(226, 114, spec.r, { bold: true, size: 15, color: 'primary' }) + text(180, 150, 'centre', { size: 11, color: 'muted' });
  } else if (spec.shape === 'triangles') {
    const n = spec.tris.length; const w = n === 1 ? 240 : 124; const gap = n === 1 ? 0 : 60;
    const x0 = (W - (n * w + (n - 1) * gap)) / 2;
    spec.tris.forEach((t, i) => {
      const bx = x0 + i * (w + gap); const by = 206; const apexX = bx + w * 0.38; const apexY = 56;
      s += `<polygon points="${bx},${by} ${bx + w},${by} ${apexX},${apexY}" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>`;
      s += line(apexX, apexY, apexX, by, { dash: true, w: 1.8, op: 0.6 }) + `<polyline points="${apexX + 10},${by} ${apexX + 10},${by - 10} ${apexX},${by - 10}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
      s += text(bx + w / 2, by + 20, t.base, { bold: true, size: 14 }) + text(apexX + 6, (apexY + by) / 2, t.height, { bold: true, size: 14, anchor: 'start' });
      if (t.name) s += text(apexX, apexY - 8, t.name[0], { bold: true }) + text(bx - 10, by + 4, t.name[1], { bold: true }) + text(bx + w + 10, by + 4, t.name[2], { bold: true });
    });
  }
  return svgOf(W, H, s, 'A shape with labelled side lengths');
}

/* ---------------- CAST diagram ---------------- */

function renderCast(spec) {
  const c = 170; let s = `<circle cx="${c}" cy="130" r="104" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="2.5"/>` + line(c - 116, 130, c + 116, 130, { op: 0.7, w: 1.8 }) + line(c, 14, c, 246, { op: 0.7, w: 1.8 });
  const L = [['A', 'All', 1, c + 52, 82], ['S', 'Sine', 2, c - 52, 82], ['T', 'Tangent', 3, c - 52, 188], ['C', 'Cosine', 4, c + 52, 188]];
  L.forEach(([ch, , q, x, y]) => {
    const hid = spec.hide === q;
    s += `<circle cx="${x}" cy="${y}" r="26" style="fill:var(--surface);stroke:${hid ? col('accent') : col('primary')}" stroke-width="2.5"/>` + text(x, y + 8, hid ? '?' : ch, { bold: true, size: 24, color: hid ? 'accent' : undefined });
    s += text(x + (q === 1 || q === 4 ? 40 : -40), y + (q < 3 ? -34 : 44), ['', 'I', 'II', 'III', 'IV'][q], { size: 12, color: 'muted' });
  });
  return svgOf(340, 260, s, 'The CAST diagram: which trig ratios are positive in each quadrant');
}

/* ---------------- angles of elevation and depression ---------------- */

// spec: { type:'elevation'|'depression'|'two', angle, angle2, hLabel, dLabel, sLabel }
function renderElev(spec) {
  const W = 380; const H = 260; const gy = 222; const rad = (d) => (d * Math.PI) / 180;
  let s = line(8, gy, W - 8, gy, { w: 3, op: 0.7 });
  const arcAt = (cx, cy, r, from, to) => { let d = ''; for (let i = 0; i <= 24; i++) { const a = from + ((to - from) * i) / 24; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy - Math.sin(a) * r).toFixed(1)} `; } return `<path d="${d}" fill="none" style="stroke:${col('accent')}" stroke-width="2.5"/>`; };
  const person = (x, y) => `<circle cx="${x}" cy="${y - 20}" r="5" fill="currentColor"/><line x1="${x}" y1="${y - 15}" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`;
  if (spec.type === 'elevation') {
    const th = rad(spec.angle); const dy = Math.min(150, 250 * Math.tan(th)); const dx = dy / Math.tan(th);
    const ox = 40; const eyeY = gy - 18; const tx = ox + dx; const ty = eyeY - dy;
    s += `<rect x="${tx - 16}" y="${ty}" width="32" height="${gy - ty}" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5"/>` + person(ox, gy);
    s += line(ox, eyeY, tx, eyeY, { dash: true, w: 1.8, op: 0.6 }) + line(ox, eyeY, tx, ty, { color: 'primary', w: 3.5 });
    s += arcAt(ox, eyeY, 46, 0, th) + text(ox + 64, eyeY - 8, spec.angleLabel || `${spec.angle}°`, { bold: true, color: 'accent', anchor: 'start' });
    s += text(tx + 24, (ty + gy) / 2, spec.hLabel, { bold: true, size: 14, anchor: 'start' }) + text((ox + tx) / 2, gy + 24, spec.dLabel, { bold: true, size: 14 });
  } else if (spec.type === 'depression') {
    const th = rad(spec.angle); const dy = Math.min(150, 250 * Math.tan(th)); const dx = dy / Math.tan(th);
    const eyeY = gy - dy - 12; const ex = 96; const bx = ex + dx; const by = gy - 12;
    s += `<rect x="14" y="${eyeY + 16}" width="94" height="${gy - eyeY - 16}" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5"/>` + person(ex - 6, eyeY + 16);
    s += `<path d="M${bx - 22} ${gy} L${bx + 22} ${gy} L${bx + 14} ${by + 2} L${bx - 14} ${by + 2} Z" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-opacity=".7" stroke-width="2"/>`;
    s += line(ex, eyeY, W - 40, eyeY, { dash: true, w: 1.8, op: 0.6 }) + line(ex, eyeY, bx, by, { color: 'primary', w: 3.5 });
    s += arcAt(ex, eyeY, 50, -th, 0) + text(ex + 62, eyeY + 26, spec.angleLabel || `${spec.angle}°`, { bold: true, color: 'accent', anchor: 'start' });
    s += text(116 + 4, (eyeY + gy) / 2, spec.hLabel, { bold: true, size: 14, anchor: 'start' }) + text((ex + bx) / 2, gy + 24, spec.dLabel, { bold: true, size: 14 });
  } else {
    const a1 = rad(spec.angle); const a2 = rad(spec.angle2); const Ht = 110; const tx = 312;
    const xB = tx - Ht / Math.tan(a2); const xA = tx - Ht / Math.tan(a1); const ty = gy - Ht;
    s += `<rect x="${tx - 14}" y="${ty}" width="28" height="${Ht}" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5"/>`;
    s += line(xA, gy, tx, ty, { color: 'primary', w: 3 }) + line(xB, gy, tx, ty, { color: 'bad', w: 3 });
    s += arcAt(xA, gy, 40, 0, a1) + text(xA + 52, gy - 6, spec.angleLabel || `${spec.angle}°`, { bold: true, color: 'accent', anchor: 'start' });
    s += arcAt(xB, gy, 30, 0, a2) + text(xB + 4, gy - 36, spec.angle2Label || `${spec.angle2}°`, { bold: true, color: 'accent', anchor: 'start' });
    s += `<circle cx="${xA}" cy="${gy}" r="4.5" fill="currentColor"/><circle cx="${xB}" cy="${gy}" r="4.5" fill="currentColor"/>` + text(xA, gy + 20, 'A', { bold: true }) + text(xB, gy + 20, 'B', { bold: true });
    s += line(xA, gy + 34, xB, gy + 34, { w: 1.8, op: 0.7 }) + text((xA + xB) / 2, gy + 50, spec.sLabel, { bold: true, size: 14 });
    s += text(tx + 22, (ty + gy) / 2, spec.hLabel, { bold: true, size: 14, anchor: 'start' });
  }
  return svgOf(W, H + (spec.type === 'two' ? 26 : 0), s, 'A diagram with an angle of elevation or depression');
}

/* ---------------- entry ---------------- */

const KINDS = { mapping: renderMapping, fbd: renderFbd, tri: renderTriangle, angle: renderAngle, ambig: renderAmbig, pascal: renderPascal, punnett: renderPunnett, pedigree: renderPedigree, mitosis: renderMitosis, circuit: renderCircuit, meiosis: renderMeiosis, cycle: renderCycle, taxon: renderTaxon, karyo: renderKaryotype, homologs: renderHomologs, plantkey: renderPlantKey, leaf: renderLeaf, symmetry: renderSymmetry, bactshape: renderBactShape, shape: renderShape, cast: renderCast, elev: renderElev };

export const hasKind = (k) => k in KINDS;
export const renderKind = (spec) => KINDS[spec.kind](spec);
