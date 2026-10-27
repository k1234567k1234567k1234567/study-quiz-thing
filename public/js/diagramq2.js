// Math diagram questions for a Grade 11 functions course: reading graphs, relations, mapping diagrams,
// transformations, inverses, triangles, angles, sinusoids, exponentials, sequences and Pascal's triangle.
// Each maker returns problems { kind, topic, diagram, prompt, answer, wrong[3], explain, tf?, fill? } where the answer
// is worked out here from the same numbers that draw the picture.
import { pick, shuffle, rnd, num, pointStr, withWrong, signed, ineq, frac, half, round1 } from './dutil.js';
import { evalF, zigAt } from './diagrams.js';

const both = (dom, rng) => `Domain: ${dom}; Range: ${rng}`;
const VIEW = [-6, 6, -6, 6];
const MINUS = '−';
const deg = '°';

// same graph? (used so a wrong option can never be a second right answer)
const sameGraph = (f, g) => { for (let x = -8; x <= 8; x += 0.37) { const a = evalF(f, x); const b = evalF(g, x); if (Number.isFinite(a) !== Number.isFinite(b)) return false; if (Number.isFinite(a) && Math.abs(a - b) > 1e-6) return false; } return true; };
const lattice = (f, lo = -5, hi = 5) => { const out = []; for (let x = lo; x <= hi; x++) { const y = evalF(f, x); if (Number.isFinite(y) && Number.isInteger(y) && Math.abs(y) <= 5) out.push([x, y]); } return out; };
const onGraph = (f, x, y) => { const v = evalF(f, x); return Number.isFinite(v) && Math.abs(v - y) < 1e-9; };

/* ================= reading graphs (function notation, intercepts) ================= */

function randCurve() {
  const t = pick(['lin', 'quad', 'abs', 'sqrt']);
  if (t === 'lin') return { type: 'lin', m: pick([1, -1, 2, -2, 0.5, -0.5]), b: rnd(-3, 3) };
  if (t === 'sqrt') return { type: 'sqrt', a: pick([1, -1, 2, -2]), h: rnd(-4, 1), k: rnd(-3, 3) };
  return { type: t, a: pick([1, -1, 2, -2, 0.5, -0.5]), h: rnd(-3, 3), k: rnd(-3, 3) };
}

export function readProblems() {
  const name = pick(['f', 'g', 'h']);
  let f; let pts;
  for (let i = 0; i < 80; i++) { f = randCurve(); pts = lattice(f); if (pts.length >= 4) break; }
  if (!f || pts.length < 4) return [];
  const diagram = { kind: 'graph', f, view: VIEW, label: `Graph of y = ${name}(x)` };
  const out = [];
  const topic = 'Reading graphs';

  // value: find f(a)
  const [ax, ay] = pick(pts);
  out.push({
    kind: 'graph', topic, diagram: { ...diagram, vline: ax },
    prompt: `The graph of y = ${name}(x) is shown. Find ${name}(${num(ax)}).`, answer: num(ay),
    wrong: withWrong(num(ay), [num(ay + 1), num(ay - 1), num(-ay), num(ax)], (i) => num(ay + i + 1)),
    explain: `Go to x = ${num(ax)} on the horizontal axis, then read the height of the graph: ${name}(${num(ax)}) = ${num(ay)}.`,
    fill: { q: `The graph of y = ${name}(x) is shown. ${name}(${num(ax)}) = _____`, answer: num(ay) },
  });

  // solve: for what x is f(x) = c
  const [bx, by] = pick(pts);
  const sols = []; for (let x = -6; x <= 6; x++) if (onGraph(f, x, by)) sols.push(x);
  const expect = (f.type === 'quad' || f.type === 'abs') && bx !== f.h ? 2 : 1;
  if (sols.length === expect) {
    const ans = sols.length === 2 ? `x = ${num(sols[0])} and x = ${num(sols[1])}` : `x = ${num(sols[0])}`;
    out.push({
      kind: 'graph', topic, diagram: { ...diagram, hline: by },
      prompt: `The graph of y = ${name}(x) is shown. For what value(s) of x is ${name}(x) = ${num(by)}?`, answer: ans,
      wrong: withWrong(ans, sols.length === 2 ? [`x = ${num(sols[0])}`, `x = ${num(by)}`, `x = ${num(sols[1])}`] : [`x = ${num(by)}`, `x = ${num(-sols[0])}`, `x = ${num(sols[0] + 1)} and x = ${num(sols[0] - 1)}`], (i) => `x = ${num(sols[0] + i)}`),
      explain: `Find the height y = ${num(by)} (the dashed line) and read the x-value of every point where the graph crosses it.`,
    });
  }

  // which point is on the graph
  const [cx, cy] = pick(pts);
  const right = pointStr(cx, cy);
  const cands = [[cx, cy + 1], [cx + 1, cy], [-cx, cy], [cx, -cy], [cy, cx], [cx - 1, cy - 1]].filter(([x, y]) => !onGraph(f, x, y) && Math.abs(x) <= 6 && Math.abs(y) <= 6).map(([x, y]) => pointStr(x, y));
  if (new Set(cands).size >= 3) {
    out.push({
      kind: 'graph', topic, diagram, prompt: `Which point lies on the graph of y = ${name}(x)?`, answer: right,
      wrong: [...new Set(cands)].filter((c) => c !== right).slice(0, 3),
      explain: `A point is on the graph when its height equals the graph's height at that x. ${name}(${num(cx)}) = ${num(cy)}, so ${right} is on it.`,
      tf: { q: `The point ${right} lies on the graph.`, answer: true },
    });
  }

  // intercepts (only when they are whole numbers)
  const y0 = evalF(f, 0);
  if (Number.isInteger(y0) && Math.abs(y0) <= 5) {
    const yi = pointStr(0, y0);
    out.push({
      kind: 'graph', topic, diagram, prompt: 'What is the y-intercept of the graph?', answer: yi,
      wrong: withWrong(yi, [pointStr(y0, 0), pointStr(0, -y0), pointStr(1, y0), pointStr(0, y0 + 1)], (i) => pointStr(0, y0 + i + 1)),
      explain: `The y-intercept is where the graph crosses the vertical axis, at ${yi}.`,
    });
  }
  const zeros = []; for (let x = -6; x <= 6; x++) if (onGraph(f, x, 0)) zeros.push(x);
  let nz = null;
  if (f.type === 'lin') nz = 1;
  else if (f.type === 'quad' || f.type === 'abs') { const t = -f.k / f.a; nz = t < 0 ? 0 : t === 0 ? 1 : (f.type === 'quad' ? (Number.isInteger(Math.sqrt(t)) ? 2 : -1) : (Number.isInteger(t) ? 2 : -1)); }
  else if (f.type === 'sqrt') { const t = -f.k / f.a; nz = t < 0 ? 0 : Number.isInteger(t * t) ? 1 : -1; }
  if (nz !== null && nz >= 0 && zeros.length === nz && (f.type !== 'lin' || zeros.length === 1)) {
    const ans = nz === 0 ? 'There are no x-intercepts' : zeros.map((z) => pointStr(z, 0)).join(' and ');
    const w = nz === 0 ? [pointStr(0, evalF(f, 0)), pointStr(1, 0), pointStr(-1, 0)] : [zeros.map((z) => pointStr(0, z)).join(' and '), zeros.map((z) => pointStr(-z, 0)).join(' and '), 'There are no x-intercepts', pointStr(zeros[0] + 1, 0)];
    out.push({
      kind: 'graph', topic, diagram, prompt: 'State the x-intercept(s) of the graph. (Where does it cross the horizontal axis?)', answer: ans,
      wrong: withWrong(ans, w, (i) => pointStr(i + 5, 0)),
      explain: nz === 0 ? 'The graph never touches the x-axis, so there are no x-intercepts.' : 'The x-intercepts are the points where the graph meets the x-axis (where y = 0).',
    });
  }
  return out;
}

/* ================= vertical line test, circles and mapping diagrams ================= */

export function vltProblems() {
  const out = []; const topic = 'Relations';
  const choices = ['line', 'parabola', 'abs', 'sqrt', 'side', 'circle'];
  const kind = pick(choices);
  let diagram; let isFn; let c; let marks = [];
  if (kind === 'side') {
    const h = rnd(-4, -1); const k = rnd(-2, 2); const t = rnd(1, 2); c = h + t * t;
    diagram = { kind: 'graph', rel: { type: 'side', a: 1, h, k }, view: VIEW, vline: c };
    marks = [{ x: c, y: k + t, color: 'bad' }, { x: c, y: k - t, color: 'bad' }]; isFn = false;
  } else if (kind === 'circle') {
    const r = pick([3, 4, 5]); c = rnd(-2, 2);
    const y = Math.sqrt(r * r - c * c);
    diagram = { kind: 'graph', rel: { type: 'circle', cx: 0, cy: 0, r }, view: VIEW, vline: c };
    marks = [{ x: c, y, color: 'bad' }, { x: c, y: -y, color: 'bad' }]; isFn = false;
  } else {
    let f;
    for (let i = 0; i < 40; i++) { f = randCurve(); if (f.type === (kind === 'line' ? 'lin' : kind === 'parabola' ? 'quad' : kind === 'abs' ? 'abs' : 'sqrt') && lattice(f).length >= 3) break; f = null; }
    if (!f) return [];
    const [x, y] = pick(lattice(f)); c = x;
    diagram = { kind: 'graph', f, view: VIEW, vline: c }; marks = [{ x, y, color: 'good' }]; isFn = true;
  }
  diagram.marks = marks;
  const yes = 'Yes, it is a function: the vertical line crosses it only once';
  const no = 'No, it is not a function: the vertical line crosses it more than once';
  const ans = isFn ? yes : no;
  out.push({
    kind: 'graph', topic, diagram, prompt: 'Use the vertical line test (the dashed line). Is this relation a function?', answer: ans,
    wrong: [isFn ? no : yes, 'Yes, it is a function: it passes through the origin', 'No, it is not a function: it is not a straight line'],
    explain: isFn ? 'A relation is a function if every vertical line crosses its graph at most once. Each x-value has exactly one y-value.' : 'Some x-values have two y-values, so a vertical line crosses the graph twice. That means it is not a function.',
    tf: { q: 'This relation is a function.', answer: isFn },
  });
  return out;
}

export function circleProblems() {
  const r = pick([2, 3, 4, 5]);
  const dr = both(`${MINUS}${r} ≤ x ≤ ${r}`, `${MINUS}${r} ≤ y ≤ ${r}`);
  return [{
    kind: 'graph', topic: 'Relations', diagram: { kind: 'graph', rel: { type: 'circle', cx: 0, cy: 0, r }, view: VIEW },
    prompt: `State the domain and range of the relation x² + y² = ${r * r}.`, answer: dr,
    wrong: withWrong(dr, [both(`0 ≤ x ≤ ${r}`, `0 ≤ y ≤ ${r}`), both(`${MINUS}${r * r} ≤ x ≤ ${r * r}`, `${MINUS}${r * r} ≤ y ≤ ${r * r}`), both('all real numbers', 'all real numbers'), both(`${MINUS}${r} ≤ x ≤ ${r}`, `0 ≤ y ≤ ${r}`)], (i) => both(`${MINUS}${r + i} ≤ x ≤ ${r + i}`, `${MINUS}${r + i} ≤ y ≤ ${r + i}`)),
    explain: `x² + y² = r² is a circle with centre (0, 0) and radius r. Here r = ${r}, so x and y both go from ${MINUS}${r} to ${r}. It is not a function.`,
  }];
}

export function mappingProblems() {
  const A = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -2, 0]).slice(0, rnd(3, 4)).sort((a, b) => a - b);
  const B = shuffle([2, 3, 4, 5, 6, 7, 8, 10, 12, -3, -4, 0, 1]).slice(0, rnd(3, 4));
  const isFn = Math.random() < 0.55;
  const pairs = A.map((_, i) => [i, rnd(0, B.length - 1)]);
  if (!isFn) { const i = rnd(0, A.length - 1); let j = rnd(0, B.length - 1); while (pairs.some((p) => p[0] === i && p[1] === j)) j = rnd(0, B.length - 1); pairs.push([i, j]); }
  const diagram = { kind: 'mapping', A: A.map(num), B: B.map(num), pairs };
  const out = [];
  const topic = 'Mapping diagrams';
  const yes = 'Yes: every input has exactly one output'; const no = 'No: one input has two outputs';
  out.push({
    kind: 'graph', topic, diagram, prompt: 'Does this mapping diagram show a function?', answer: isFn ? yes : no,
    wrong: [isFn ? no : yes, 'Yes: every output has exactly one input', 'No: two inputs go to the same output'],
    explain: isFn ? 'In a function each input has exactly one arrow leaving it. Two inputs may share the same output.' : 'An input with two arrows has two outputs, so the relation is not a function.',
    tf: { q: 'This mapping diagram shows a function.', answer: isFn },
  });
  if (isFn) {
    const dom = `{${A.map(num).join(', ')}}`;
    const rangeVals = [...new Set(pairs.map((p) => B[p[1]]))].sort((a, b) => a - b);
    const rng = `{${rangeVals.map(num).join(', ')}}`;
    const extra = B.find((v) => !rangeVals.includes(v));
    out.push({
      kind: 'graph', topic, diagram, prompt: 'State the range of the function shown in the mapping diagram.', answer: rng,
      wrong: withWrong(rng, [extra !== undefined ? `{${[...rangeVals, extra].sort((a, b) => a - b).map(num).join(', ')}}` : `{${[...rangeVals, 99].map(num).join(', ')}}`, dom, rangeVals.length > 1 ? `{${rangeVals.slice(1).map(num).join(', ')}}` : `{${num(rangeVals[0] + 1)}}`], (i) => `{${rangeVals.map((v) => num(v + i)).join(', ')}}`),
      explain: 'The range is the set of outputs that are actually reached by an arrow. Outputs with no arrow are not in the range.',
    });
  }
  return out;
}

/* ================= transformations ================= */

const innerText = (k, d) => {
  const sx = k === 1 ? 'x' : k === -1 ? `${MINUS}x` : `${half(k)}x`;
  if (!d) return sx;
  const core = `x ${d > 0 ? MINUS : '+'} ${num(Math.abs(d))}`;
  return k === 1 ? core : k === -1 ? `${MINUS}(${core})` : `${half(k)}(${core})`;
};
const eqText = ({ a, k, d, c }) => `y = ${a === 1 ? '' : a === -1 ? MINUS : half(a)}f(${innerText(k, d)})${c ? signed(c) : ''}`;
const describe = ({ a, k, d, c }) => {
  const p = [];
  if (Math.abs(k) !== 1) p.push(`${Math.abs(k) > 1 ? 'compress' : 'stretch'} horizontally by a factor of ${half(1 / Math.abs(k))}`);
  if (Math.abs(a) !== 1) p.push(`${Math.abs(a) > 1 ? 'stretch' : 'compress'} vertically by a factor of ${half(Math.abs(a))}`);
  if (k < 0) p.push('reflect in the y-axis');
  if (a < 0) p.push('reflect in the x-axis');
  if (d) p.push(`translate ${num(Math.abs(d))} ${d > 0 ? 'right' : 'left'}`);
  if (c) p.push(`translate ${num(Math.abs(c))} ${c > 0 ? 'up' : 'down'}`);
  const s = p.join(', then ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const trF = (base, t) => ({ type: 'tr', base, ...t });

export function transformProblems() {
  const base = pick(['zig', 'zig', 'zig', 'quad', 'sqrt', 'abs', 'recip']);
  const sets = base === 'zig'
    ? [{ a: 1, k: 1, d: rnd(-3, 3), c: rnd(-3, 3) }, { a: -1, k: 1, d: rnd(-2, 2), c: rnd(-2, 2) }, { a: 1, k: -1, d: rnd(-2, 2), c: rnd(-2, 2) }, { a: pick([2, 0.5]), k: 1, d: 0, c: rnd(-2, 2) }, { a: 1, k: pick([2, 0.5]), d: rnd(-2, 2), c: 0 }, { a: pick([-2, 2]), k: pick([2, 0.5]), d: rnd(-2, 2), c: rnd(-2, 2) }]
    : [{ a: 1, k: 1, d: rnd(-3, 3), c: rnd(-3, 3) }, { a: -1, k: 1, d: rnd(-2, 2), c: rnd(-2, 2) }, { a: pick([2, 3]), k: 1, d: 0, c: rnd(-2, 2) }, { a: 1, k: 1, d: rnd(-3, 3), c: rnd(-3, 3) }, ...(base === 'sqrt' ? [{ a: 1, k: -1, d: rnd(-2, 2), c: rnd(-2, 2) }] : [])];
  const t = pick(sets);
  if (t.a === 1 && t.k === 1 && !t.d && !t.c) return [];
  const g = trF(base, t); const f0 = trF(base, { a: 1, k: 1, d: 0, c: 0 });
  // every visible bit of the solid graph must sit inside the grid
  let seen = 0; let wild = 0;
  for (let x = -8; x <= 8; x += 0.25) { const y = evalF(g, x); if (Number.isFinite(y)) { if (Math.abs(y) <= 7.5) seen++; else if (base === 'zig') wild++; } }
  if (seen < 12 || wild) return [];
  const view = [-8, 8, -8, 8];
  const marks = base === 'zig' ? [-4, 4].map((u) => ({ x: t.d + u / t.k, y: t.a * zigAt(u) + t.c, color: 'primary' })) : [];
  if (marks.some((m) => Math.abs(m.x) > 7.5 || Math.abs(m.y) > 7.5)) return [];
  const diagram = { kind: 'graph', f: g, curves: [{ f: f0, dash: true, color: 'muted' }], marks, view, label: 'Dashed graph y = f(x) and solid transformed graph' };
  const topic = 'Transformations';
  const out = [];
  const correct = eqText(t);
  const alts = [{ ...t, d: -t.d }, { ...t, c: -t.c }, { ...t, a: -t.a }, { ...t, k: -t.k }, { ...t, d: t.d + 1 }, { ...t, c: t.c + 2 }, { ...t, a: t.a === 1 ? 2 : 1 }, { a: t.k, k: t.a, d: t.d, c: t.c }]
    .filter((p) => eqText(p) !== correct && !sameGraph(trF(base, p), g)).map(eqText);
  const wrongEq = [...new Set(alts)].slice(0, 3);
  if (wrongEq.length === 3) {
    out.push({
      kind: 'graph', topic, diagram, prompt: 'The dashed graph is y = f(x). Which equation describes the solid graph?', answer: correct, wrong: wrongEq,
      explain: `${describe(t)}. In y = a f(k(x − d)) + c, a is the vertical stretch/reflection, k the horizontal stretch/reflection, d the shift right and c the shift up.`,
    });
  }
  const desc = describe(t);
  const dalts = [{ ...t, d: -t.d, c: t.c }, { ...t, c: -t.c }, { ...t, a: -t.a }, { ...t, k: -t.k }, { ...t, a: t.a === 1 ? 2 : 1 }, { ...t, d: t.d + 1 }].map(describe).filter((s) => s && s !== desc);
  const wd = [...new Set(dalts)].slice(0, 3);
  if (wd.length === 3 && desc) {
    out.push({
      kind: 'graph', topic, diagram, prompt: 'Describe how the solid graph is obtained from the dashed graph y = f(x).', answer: desc, wrong: wd,
      explain: `The solid graph is ${correct}.`,
    });
  }
  // domain and range of the solid graph, worked out from the transformation
  let dom; let rng;
  if (base === 'zig') { dom = ineq('x', t.d - 4 / Math.abs(t.k), t.d + 4 / Math.abs(t.k)); rng = ineq('y', t.c - 2 * Math.abs(t.a), t.c + 2 * Math.abs(t.a)); }
  else if (base === 'quad' || base === 'abs') { dom = 'all real numbers'; rng = t.a > 0 ? ineq('y', t.c, Infinity) : ineq('y', -Infinity, t.c); }
  else if (base === 'sqrt') { dom = t.k > 0 ? ineq('x', t.d, Infinity) : ineq('x', -Infinity, t.d); rng = t.a > 0 ? ineq('y', t.c, Infinity) : ineq('y', -Infinity, t.c); }
  else { dom = `x ≠ ${num(t.d)}`; rng = `y ≠ ${num(t.c)}`; }
  const dr = both(dom, rng);
  const w = [];
  if (base === 'zig') w.push(both(ineq('x', t.c - 2 * Math.abs(t.a), t.c + 2 * Math.abs(t.a)), ineq('y', t.d - 4 / Math.abs(t.k), t.d + 4 / Math.abs(t.k))), both(ineq('x', -4, 4), ineq('y', -2, 2)), both(ineq('x', -t.d - 4 / Math.abs(t.k), -t.d + 4 / Math.abs(t.k)), rng), both(dom, ineq('y', -t.c - 2 * Math.abs(t.a), -t.c + 2 * Math.abs(t.a))));
  else if (base === 'recip') w.push(both(`x ≠ ${num(t.c)}`, `y ≠ ${num(t.d)}`), both(`x ≠ ${num(-t.d)}`, rng), both(dom, `y ≠ ${num(-t.c)}`), both('all real numbers', rng));
  else w.push(both(rng.replace(/y/g, 'x'), dom.replace(/x/g, 'y')), both('all real numbers', 'all real numbers'), both(dom, rng.replace(/≥/, '≤').replace(/>/, '<')), both(base === 'sqrt' ? ineq('x', -t.d, Infinity) : 'all real numbers', rng));
  out.push({
    kind: 'graph', topic, diagram, prompt: 'State the domain and range of the solid (transformed) graph.', answer: dr,
    wrong: withWrong(dr, w, (i) => both(dom, ineq('y', t.c + i, Infinity))),
    explain: 'Move the dashed graph’s domain and range through the same transformation: stretches multiply, reflections flip, translations shift.',
    check: { base, t },
  });
  if (base === 'zig') {
    const u = pick([-4, -2, 0, 2, 4]); const v = zigAt(u);
    const ix = t.d + u / t.k; const iy = t.a * v + t.c; const img = pointStr(ix, iy);
    if (Math.abs(ix) <= 7.5 && Math.abs(iy) <= 7.5) {
      const mist = [pointStr(t.d + u * t.k, iy), pointStr(-t.d + u / t.k, iy), pointStr(ix, t.a * (v + t.c)), pointStr(ix, t.a * v - t.c), pointStr(u / t.k - t.d, iy), pointStr(iy, ix)];
      out.push({
        kind: 'graph', topic, diagram: { ...diagram, marks: [{ x: u, y: v, label: 'A', color: 'accent' }, ...marks] },
        prompt: `Point A(${num(u)}, ${num(v)}) is on the dashed graph y = f(x). What are the coordinates of its image on the solid graph, ${correct}?`, answer: img,
        wrong: withWrong(img, [...new Set(mist)].filter((x) => x !== img), (i) => pointStr(ix + i, iy)),
        explain: `Apply the transformation to the point: x becomes ${t.d ? `x \u00f7 ${num(t.k)} + ${num(t.d)}` : `x \u00f7 ${num(t.k)}`} and y becomes ${num(t.a)}y${t.c ? ` + ${num(t.c)}` : ''}. So (${num(u)}, ${num(v)}) \u2192 ${img}.`,
        check: { image: [ix, iy] },
      });
    }
  } else {
    const BASEEQ = { quad: 'y = x\u00b2', sqrt: 'y = \u221ax', abs: 'y = |x|', recip: 'y = 1/x' };
    out.push({
      kind: 'graph', topic: 'Parent functions', diagram: { kind: 'graph', f: f0, view: VIEW }, prompt: 'Which parent function is graphed?', answer: BASEEQ[base],
      wrong: [...Object.keys(BASEEQ).filter((k) => k !== base).map((k) => BASEEQ[k]), 'y = x'].slice(0, 3),
      explain: base === 'quad' ? 'A U-shaped parabola through the origin: y = x\u00b2.' : base === 'sqrt' ? 'Half a sideways parabola that starts at the origin and goes up to the right: y = \u221ax.' : base === 'abs' ? 'A V shape with its point at the origin: y = |x|.' : 'Two curves in opposite corners that approach the axes (asymptotes at x = 0 and y = 0): y = 1/x.',
    });
  }
  return out;
}

/* ================= inverse functions ================= */

const linText = (m, b) => `y = ${m === 1 ? '' : m === -1 ? MINUS : half(m)}x${b ? signed(b) : ''}`;

export function inverseProblems() {
  const m = pick([2, -2, 0.5, -0.5]);
  const b = Math.abs(m) === 2 ? 2 * rnd(-2, 2) : rnd(-3, 3);
  const f = { type: 'lin', m, b }; const g = { type: 'lin', m: 1 / m, b: -b / m };
  const diagram0 = { kind: 'graph', f, curves: [{ f: g, dash: true, color: 'accent' }], diag: true, view: VIEW };
  const out = []; const topic = 'Inverse functions';
  const invTxt = linText(1 / m, -b / m);
  const wrongs = [linText(m, -b), linText(-1 / m, -b / m), linText(1 / m, b), linText(-m, b), linText(1 / m, -b / m + 1)].filter((s) => s !== invTxt);
  out.push({
    kind: 'graph', topic, diagram: diagram0,
    prompt: `The solid line is f(x) = ${linText(m, b).replace('y = ', '')}. Its inverse is the dashed line, the reflection of f in y = x. Which equation is f⁻¹(x)?`, answer: invTxt,
    wrong: [...new Set(wrongs)].slice(0, 3),
    explain: `Swap x and y: x = ${linText(m, b).replace('y = ', '')}, then solve for y. That gives ${invTxt}.`,
  });
  // invariant point (where f meets y = x)
  if (m !== 1) {
    const x0 = b / (1 - m);
    if (Number.isInteger(x0) && Math.abs(x0) <= 5 && x0 !== 0) {
      const ans = pointStr(x0, x0);
      const cands = [pointStr(x0, -x0), pointStr(-x0, x0), pointStr(x0 + 1, x0 + 1), pointStr(b, 0), pointStr(0, b)].filter((s) => s !== ans);
      out.push({
        kind: 'graph', topic, diagram: diagram0, prompt: 'A point that lies on both f and its inverse is called an invariant point. Which point is invariant here?', answer: ans,
        wrong: [...new Set(cands)].slice(0, 3),
        explain: 'Invariant points lie on the line y = x, where f and its reflection cross. Read where the two lines meet the dashed line y = x.',
      });
    }
  }
  // restricted domain: domain and range swap
  const from = rnd(-4, 0); const to = from + rnd(2, 4);
  const y1 = evalF(f, from); const y2 = evalF(f, to);
  if (Math.abs(y1) <= 5 && Math.abs(y2) <= 5 && to <= 5 && Math.abs(evalF(g, y1)) <= 6) {
    const lo = Math.min(y1, y2); const hi = Math.max(y1, y2);
    const ans = both(ineq('x', lo, hi), ineq('y', from, to));
    out.push({
      kind: 'graph', topic,
      diagram: { kind: 'graph', f, from, to, curves: [{ f: g, from: lo, to: hi, dash: true, color: 'accent' }], marks: [{ x: from, y: y1 }, { x: to, y: y2 }, { x: y1, y: from, color: 'primary' }, { x: y2, y: to, color: 'primary' }], diag: true, view: VIEW },
      prompt: 'The solid segment is f and the dashed segment is its inverse f⁻¹. State the domain and range of f⁻¹.', answer: ans,
      wrong: withWrong(ans, [both(ineq('x', from, to), ineq('y', lo, hi)), both(ineq('x', -hi, -lo), ineq('y', from, to)), both(ineq('x', lo, hi), ineq('y', -to, -from))], (i) => both(ineq('x', lo, hi + i), ineq('y', from, to))),
      explain: 'The domain of the inverse is the range of f, and the range of the inverse is the domain of f. The x- and y-values swap.',
    });
  }
  // inverse of a parabola: a sideways parabola, which is not a function
  if (Math.random() < 0.6) {
    const a2 = pick([1, -1]); const h2 = rnd(-2, 2); const k2 = rnd(-2, 2);
    const par = { type: 'quad', a: a2, h: h2, k: k2 };
    const dia = { kind: 'graph', f: par, curves: [{ rel: { type: 'side', a: a2, h: k2, k: h2 }, dash: true, color: 'accent' }], diag: true, view: VIEW };
    out.push({
      kind: 'graph', topic, diagram: dia, prompt: 'The solid curve is f(x) and the dashed curve is its inverse (the reflection of f in y = x). Is the inverse also a function?',
      answer: 'No: the dashed graph fails the vertical line test',
      wrong: ['Yes: it passes the vertical line test', 'Yes: every parabola has a function as its inverse', 'Only if a > 0'],
      explain: 'Reflecting a parabola in y = x gives a sideways parabola. A vertical line crosses it twice, so the inverse is not a function.',
      tf: { q: 'The inverse of this parabola is a function.', answer: false },
    });
    const right = `x \u2265 ${num(h2)}`;
    out.push({
      kind: 'graph', topic, diagram: dia, prompt: 'Which restriction on the domain of f makes its inverse a function?', answer: right,
      wrong: ['all real numbers', `x \u2265 ${num(h2 - 2)}`, `x \u2264 ${num(h2 + 2)}`],
      explain: `Keep only one side of the parabola, starting at the vertex's x-value ${num(h2)}: then f passes the horizontal line test and its inverse passes the vertical line test.`,
    });
  }
  return out;
}

/* ================= right triangles and special triangles ================= */

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [7, 24, 25], [9, 12, 15], [20, 21, 29]];
const RATIO_NAMES = ['sin', 'cos', 'tan'];
const RATIO6 = ['sin', 'cos', 'tan', 'sin', 'cos', 'tan', 'csc', 'sec', 'cot'];

// A is at the top, B bottom right, C the right angle at the bottom left. a = BC, b = CA, c = AB.
const rightTri = (a, b) => ({ pts: [[0, b], [a, 0], [0, 0]], v: ['A', 'B', 'C'], right: 2 });

export function rightTriProblems() {
  const out = []; const topic = 'Right triangles';
  const [a, b, c] = pick(TRIPLES);
  const atA = Math.random() < 0.5;
  const opp = atA ? a : b; const adj = atA ? b : a;
  const ratios = { sin: frac(opp, c), cos: frac(adj, c), tan: frac(opp, adj), csc: frac(c, opp), sec: frac(c, adj), cot: frac(adj, opp) };
  const wh = pick(RATIO6);
  const mk = (num_, den) => frac(num_, den);
  const all = [mk(opp, c), mk(adj, c), mk(opp, adj), mk(c, opp), mk(c, adj), mk(adj, opp)];
  const diagram = { kind: 'tri', ...rightTri(a, b), sides: [String(a), String(b), String(c)], angles: atA ? ['θ', '', ''] : ['', 'θ', ''] };
  out.push({
    kind: 'graph', topic, diagram, prompt: `In the right triangle shown, what is ${wh} θ?`, answer: ratios[wh],
    wrong: withWrong(ratios[wh], all.filter((x) => x !== ratios[wh]), (i) => frac(opp + i, c)),
    explain: `SOH CAH TOA: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent; csc, sec and cot are the reciprocals of sin, cos and tan. Here the side opposite θ is ${opp}, the adjacent side is ${adj} and the hypotenuse is ${c}.`,
  });
  // missing side with an angle
  const ang = rnd(25, 65); const hyp = rnd(8, 20);
  const r = (ang * Math.PI) / 180;
  const oppSide = hyp * Math.sin(r); const adjSide = hyp * Math.cos(r);
  const askOpp = Math.random() < 0.5;
  const ans = round1(askOpp ? oppSide : adjSide);
  const aa = hyp * Math.cos(r); const bb = hyp * Math.sin(r); // C at the origin: B along x (adjacent to the angle at B), A up
  const tri = { pts: [[0, bb], [aa, 0], [0, 0]], v: ['A', 'B', 'C'], right: 2, angles: ['', `${ang}${deg}`, ''] };
  out.push({
    kind: 'graph', topic,
    diagram: { kind: 'tri', ...tri, sides: askOpp ? ['', 'x', String(hyp)] : ['x', '', String(hyp)], hi: askOpp ? 1 : 0 },
    prompt: `Find the length of side x, to the nearest tenth. (Angle B = ${ang}${deg}, hypotenuse = ${hyp}.)`, answer: ans,
    wrong: withWrong(ans, [round1(askOpp ? adjSide : oppSide), round1(hyp * Math.tan(r)), round1(hyp / Math.sin(r)), round1(hyp / Math.cos(r))], (i) => round1((askOpp ? oppSide : adjSide) + i)),
    explain: askOpp ? `x is opposite angle B, so sin ${ang}${deg} = x/${hyp} and x = ${hyp} × sin ${ang}${deg} ≈ ${ans}.` : `x is adjacent to angle B, so cos ${ang}${deg} = x/${hyp} and x = ${hyp} × cos ${ang}${deg} ≈ ${ans}.`,
    fill: { q: `Find x to the nearest tenth: x = _____`, answer: ans },
  });
  // missing angle
  const l1 = rnd(4, 12); const l2 = rnd(l1 + 1, 16);
  const theta = (Math.atan(l1 / l2) * 180) / Math.PI;
  const ansA = String(Math.round(theta));
  out.push({
    kind: 'graph', topic, diagram: { kind: 'tri', ...rightTri(l2, l1), sides: [String(l2), String(l1), ''], angles: ['', 'θ', ''] },
    prompt: `Find angle θ to the nearest degree. (The legs are ${l1} and ${l2}.)`, answer: `${ansA}${deg}`,
    wrong: withWrong(`${ansA}${deg}`, [`${Math.round(90 - theta)}${deg}`, `${Math.round(theta) + 5}${deg}`, `${Math.round(theta) - 6}${deg}`, `${Math.round((Math.asin(l1 / l2) * 180) / Math.PI) || 45}${deg}`], (i) => `${Math.round(theta) + 9 + i}${deg}`),
    explain: `θ is opposite the side ${l1} and next to the side ${l2}, so tan θ = ${l1}/${l2} and θ = tan⁻¹(${l1}/${l2}) ≈ ${ansA}${deg}.`,
  });
  return out;
}

const SPECIAL = {
  30: { sin: '1/2', cos: '√3/2', tan: '1/√3' },
  60: { sin: '√3/2', cos: '1/2', tan: '√3' },
  45: { sin: '1/√2', cos: '1/√2', tan: '1' },
};
const EXACT_POOL = ['1/2', '√3/2', '1/√3', '√3', '1/√2', '1', '√2', '2', '2/√3'];

export function specialProblems() {
  const t = pick([30, 60, 45]); const wh = pick(RATIO_NAMES);
  let diagram;
  if (t === 45) diagram = { kind: 'tri', pts: [[0, 1], [1, 0], [0, 0]], v: ['A', 'B', 'C'], right: 2, sides: ['1', '1', '√2'], angles: ['', 'θ = 45°', ''] };
  else {
    // 30-60-90: A (top) = 30, B = 60, so side a = BC = 1, b = CA = √3, c = 2
    const at30 = t === 30;
    diagram = { kind: 'tri', pts: [[0, Math.sqrt(3)], [1, 0], [0, 0]], v: ['A', 'B', 'C'], right: 2, sides: ['1', '√3', '2'], angles: at30 ? ['θ = 30°', '60°', ''] : ['30°', 'θ = 60°', ''] };
  }
  const ans = SPECIAL[t][wh];
  return [{
    kind: 'graph', topic: 'Special triangles', diagram, prompt: `Use the special triangle shown. What is the exact value of ${wh} θ?`, answer: ans,
    wrong: withWrong(ans, shuffle(EXACT_POOL.filter((x) => x !== ans)), (i) => `${i}/2`),
    explain: t === 45 ? 'In the 45-45-90 triangle the sides are 1, 1 and √2. For example sin 45° = 1/√2 and tan 45° = 1.' : 'In the 30-60-90 triangle the sides are 1, √3 and 2 (the short side is opposite 30°). Use opposite, adjacent and hypotenuse for θ.',
    fill: { q: `Exact value of ${wh} ${t}${deg} (from the triangle): _____`, answer: ans },
  }];
}

/* ================= angles in standard position and the unit circle ================= */

const PTS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]];
const quadrant = (x, y) => (x > 0 && y > 0 ? 1 : x < 0 && y > 0 ? 2 : x < 0 && y < 0 ? 3 : 4);

export function angleProblems() {
  const [ux, uy, r] = pick(PTS);
  const sx = pick([1, -1]); const sy = pick([1, -1]);
  const x = ux * sx; const y = uy * sy;
  const q = quadrant(x, y);
  let theta = (Math.atan2(y, x) * 180) / Math.PI; if (theta < 0) theta += 360;
  const ref = (Math.atan(uy / ux) * 180) / Math.PI;
  const diagram = { kind: 'angle', R: Math.max(ux, uy) + 1, P: [x, y], theta, pointLabel: `P(${num(x)}, ${num(y)})` };
  const out = []; const topic = 'Angles in standard position';
  const vals = { sin: frac(y, r), cos: frac(x, r), tan: frac(y, x), csc: frac(r, y), sec: frac(r, x), cot: frac(x, y) };
  const wh = pick(RATIO6);
  const pool = [frac(-y, r), frac(-x, r), frac(x, r), frac(y, r), frac(x, y), frac(-y, x), frac(r, y), frac(r, x), frac(-r, y)];
  out.push({
    kind: 'graph', topic, diagram, prompt: `The terminal arm of angle θ passes through P(${num(x)}, ${num(y)}), so r = ${r}. What is ${wh} θ?`, answer: vals[wh],
    wrong: withWrong(vals[wh], pool.filter((s) => s !== vals[wh]), (i) => frac(x + i, r)),
    explain: `sin θ = y/r, cos θ = x/r and tan θ = y/x, and csc θ = r/y, sec θ = r/x, cot θ = x/y. With x = ${num(x)}, y = ${num(y)} and r = ${r}: sin θ = ${vals.sin}, cos θ = ${vals.cos}, tan θ = ${vals.tan}, csc θ = ${vals.csc}, sec θ = ${vals.sec}, cot θ = ${vals.cot}.`,
    fill: { q: `${wh} θ = _____`, answer: vals[wh] },
  });
  const qa = `Quadrant ${q}`;
  out.push({
    kind: 'graph', topic, diagram, prompt: 'In which quadrant does the terminal arm of θ lie?', answer: qa,
    wrong: [1, 2, 3, 4].filter((n) => n !== q).map((n) => `Quadrant ${n}`),
    explain: `x is ${x > 0 ? 'positive' : 'negative'} and y is ${y > 0 ? 'positive' : 'negative'}, so the arm is in quadrant ${q}.`,
  });
  const CAST = { 1: 'All three ratios are positive', 2: 'Only sine is positive', 3: 'Only tangent is positive', 4: 'Only cosine is positive' };
  out.push({
    kind: 'graph', topic, diagram, prompt: 'Use the CAST rule. Which primary trig ratios are positive for this angle?', answer: CAST[q],
    wrong: [1, 2, 3, 4].filter((n) => n !== q).map((n) => CAST[n]),
    explain: `CAST: in quadrant 1 all are positive, quadrant 2 sine, quadrant 3 tangent, quadrant 4 cosine. This angle is in quadrant ${q}.`,
  });
  const CT = { 1: 'A (all three are positive)', 2: 'S (sine is positive)', 3: 'T (tangent is positive)', 4: 'C (cosine is positive)' };
  const cq = rnd(1, 4);
  out.push({
    kind: 'graph', topic, diagram: { kind: 'cast', hide: cq }, prompt: 'Which letter of CAST belongs in the quadrant marked "?"', answer: CT[cq],
    wrong: [1, 2, 3, 4].filter((n) => n !== cq).map((n) => CT[n]),
    explain: 'Starting in quadrant 1 and going counterclockwise the letters are A, S, T, C (All Students Take Calculus): all ratios positive, then sine, tangent, cosine.',
  });
  const refS = `${Math.round(ref)}${deg}`; const thS = `${Math.round(theta)}${deg}`;
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the principal angle θ to the nearest degree (0° ≤ θ < 360°)?', answer: thS,
    wrong: withWrong(thS, [`${Math.round(ref)}${deg}`, `${Math.round(180 - ref)}${deg}`, `${Math.round(180 + ref)}${deg}`, `${Math.round(360 - ref)}${deg}`], (i) => `${Math.round(theta) + 10 * i}${deg}`),
    explain: `The related acute angle is tan⁻¹(${uy}/${ux}) ≈ ${refS}. In quadrant ${q}, θ = ${q === 1 ? refS : q === 2 ? `180° − ${refS}` : q === 3 ? `180° + ${refS}` : `360° − ${refS}`} ≈ ${thS}.`,
  });
  return out;
}

const UC = { 30: ['√3/2', '1/2'], 45: ['√2/2', '√2/2'], 60: ['1/2', '√3/2'] };
export function unitCircleProblems() {
  const refs = [30, 45, 60]; const q = rnd(1, 4); const ref = pick(refs);
  const theta = q === 1 ? ref : q === 2 ? 180 - ref : q === 3 ? 180 + ref : 360 - ref;
  const [cx, sy] = UC[ref];
  const sgn = { x: q === 1 || q === 4 ? '' : MINUS, y: q === 1 || q === 2 ? '' : MINUS };
  const ans = `(${sgn.x}${cx}, ${sgn.y}${sy})`;
  const rad = (theta * Math.PI) / 180;
  const flip = (s) => (s.startsWith(MINUS) ? s.slice(1) : MINUS + s);
  const pool = [`(${flip(sgn.x + cx)}, ${sgn.y}${sy})`, `(${sgn.x}${cx}, ${flip(sgn.y + sy)})`, `(${sgn.x}${sy}, ${sgn.y}${cx})`, `(${flip(sgn.x + cx)}, ${flip(sgn.y + sy)})`].filter((s) => s !== ans);
  return [{
    kind: 'graph', topic: 'Unit circle', diagram: { kind: 'angle', R: 1.3, P: [Math.cos(rad), Math.sin(rad)], theta, thetaLabel: `${theta}${deg}`, unit: true, arrow: true },
    prompt: `The unit circle is shown with an angle of ${theta}${deg}. What are the coordinates of the point the arrow points to?`, answer: ans,
    wrong: withWrong(ans, [...new Set(pool)], (i) => `(${cx}, ${i}/2)`),
    explain: `On the unit circle the point is (cos θ, sin θ). The related angle is ${ref}${deg}, so the values are ${cx} and ${sy}; the quadrant (${q}) gives the signs.`,
  }];
}

/* ================= oblique triangles: sine law, cosine law, the ambiguous case ================= */

const obliqueTri = (A, B, a) => {
  const C = 180 - A - B; const R = (d) => (d * Math.PI) / 180;
  const b = (a * Math.sin(R(B))) / Math.sin(R(A)); const c = (a * Math.sin(R(C))) / Math.sin(R(A));
  return { A, B, C, a, b, c };
};
const placeTri = (A, b, c) => { const r = (A * Math.PI) / 180; return [[0, 0], [c, 0], [b * Math.cos(r), b * Math.sin(r)]]; };

export function obliqueProblems() {
  const out = []; const topic = 'Sine and cosine law';
  // Sine law: two angles and a side
  for (let i = 0; i < 30; i++) {
    const A = rnd(35, 85); const B = rnd(35, 85); if (A + B > 150 || A + B < 80) continue;
    const a = rnd(8, 22); const t = obliqueTri(A, B, a);
    if (t.b < 3 || t.b > 40) continue;
    const ans = round1(t.b);
    out.push({
      kind: 'graph', topic,
      diagram: { kind: 'tri', pts: placeTri(A, t.b, t.c), v: ['A', 'B', 'C'], sides: [String(a), 'x', ''], angles: [`${A}${deg}`, `${B}${deg}`, ''], hi: 1 },
      prompt: `Find side x (side b), to the nearest tenth. (A = ${A}${deg}, B = ${B}${deg}, a = ${a}.)`, answer: ans,
      wrong: withWrong(ans, [round1((a * Math.sin(A * Math.PI / 180)) / Math.sin(B * Math.PI / 180)), round1(t.c), round1(a * Math.cos(B * Math.PI / 180)), round1(a / Math.sin(B * Math.PI / 180))], (j) => round1(t.b + j * 1.3)),
      explain: `Sine law: b/sin B = a/sin A, so b = ${a} × sin ${B}${deg} ÷ sin ${A}${deg} ≈ ${ans}.`,
      fill: { q: `b ≈ _____ (to the nearest tenth)`, answer: ans },
    });
    break;
  }
  // Cosine law: two sides and the included angle
  for (let i = 0; i < 30; i++) {
    const A = rnd(30, 110); const b = rnd(6, 16); const c = rnd(6, 16);
    const a2 = b * b + c * c - 2 * b * c * Math.cos((A * Math.PI) / 180); const a = Math.sqrt(a2);
    if (a < 3) continue;
    const ans = round1(a);
    out.push({
      kind: 'graph', topic,
      diagram: { kind: 'tri', pts: placeTri(A, b, c), v: ['A', 'B', 'C'], sides: ['x', String(b), String(c)], angles: [`${A}${deg}`, '', ''], hi: 0 },
      prompt: `Find side x (side a), to the nearest tenth. (b = ${b}, c = ${c}, A = ${A}${deg}.)`, answer: ans,
      wrong: withWrong(ans, [round1(Math.sqrt(b * b + c * c + 2 * b * c * Math.cos((A * Math.PI) / 180)) || a + 2), round1(Math.sqrt(Math.abs(b * b - c * c))), round1(b + c - a / 2), round1(a2 / 10)], (j) => round1(a + j * 1.7)),
      explain: `Cosine law: a² = b² + c² − 2bc cos A = ${b}² + ${c}² − 2(${b})(${c}) cos ${A}${deg}, so a ≈ ${ans}.`,
    });
    // which law?
    out.push({
      kind: 'graph', topic,
      diagram: { kind: 'tri', pts: placeTri(A, b, c), v: ['A', 'B', 'C'], sides: ['x', String(b), String(c)], angles: [`${A}${deg}`, '', ''], hi: 0 },
      prompt: 'Two sides and the angle between them are known. Which law should you use to find x?', answer: 'Cosine law',
      wrong: ['Sine law', 'Pythagorean theorem only', 'SOH CAH TOA'],
      explain: 'Use the cosine law for SAS (two sides and the included angle) or SSS. Use the sine law when you know an angle and its opposite side.',
      tf: { q: 'The cosine law is the right choice here.', answer: true },
    });
    break;
  }
  return out;
}

export function ambiguousProblems() {
  for (let i = 0; i < 60; i++) {
    const A = rnd(25, 55); const b = rnd(10, 20);
    const h = b * Math.sin((A * Math.PI) / 180);
    const mode = pick(['two', 'two', 'one', 'none']);
    let a;
    if (mode === 'two') a = Math.round((h + b) / 2); else if (mode === 'one') a = b + rnd(1, 4); else a = Math.floor(h - rnd(1, 2));
    if (a < 2) continue;
    const count = a < h - 1e-9 ? 0 : a >= b ? 1 : Math.abs(a - h) < 1e-9 ? 1 : 2;
    if (mode === 'two' && count !== 2) continue;
    if (mode === 'none' && count !== 0) continue;
    const names = ['No triangle', 'One triangle', 'Two triangles'];
    const ans = names[count];
    return [{
      kind: 'graph', topic: 'The ambiguous case', diagram: { kind: 'ambig', A, b, a },
      prompt: `Angle A = ${A}°, side b = ${b} and side a = ${a} (the dashed circle shows where side a can reach). How many triangles can be made?`, answer: ans,
      wrong: [...names.filter((n) => n !== ans), 'Infinitely many triangles'],
      explain: `Compare a with the height h = b sin A = ${b} sin ${A}${deg} ≈ ${round1(h)}. If a < h there is no triangle; if h < a < b there are two; if a ≥ b there is one. Here a = ${a}, so ${count === 0 ? 'no triangle' : count === 1 ? 'one triangle' : 'two triangles'}.`,
    }];
  }
  return [];
}

/* ================= sinusoidal functions ================= */

const sinText = (p) => {
  const aT = p.a === 1 ? '' : p.a === -1 ? MINUS : num(p.a);
  const inner = p.d ? (p.k === 1 ? `x ${p.d > 0 ? MINUS : '+'} ${Math.abs(p.d)}${deg}` : `${num(p.k)}(x ${p.d > 0 ? MINUS : '+'} ${Math.abs(p.d)}${deg})`) : (p.k === 1 ? 'x' : `${num(p.k)}x`);
  return `y = ${aT}${p.fn}(${inner})${p.c ? signed(p.c) : ''}`;
};

export function sinusoidProblems() {
  const p = { fn: pick(['sin', 'cos']), a: pick([1, 2, 3, -1, -2]), k: pick([1, 1, 2, 0.5, 3]), d: 0, c: pick([-1, 0, 0, 1, 2]) };
  if (p.fn === 'sin' && Math.random() < 0.35) p.d = pick([30, 45, 60, 90]);
  if (p.fn === 'sin' && p.a < 0) p.a = Math.abs(p.a);
  const f = { type: p.fn, a: p.a, k: p.k, d: p.d, c: p.c };
  const A = Math.abs(p.a); const period = 360 / p.k;
  const diagram = { kind: 'graph', f, view: [-180, 540, -5, 5], xstep: 90, ystep: 1, size: [480, 330], label: 'Graph of a sinusoidal function' };
  const out = []; const topic = 'Sinusoidal graphs';
  const mk = (prompt, ans, w, explain, filler) => out.push({ kind: 'graph', topic, diagram, prompt, answer: ans, wrong: withWrong(ans, w, filler), explain });
  mk('What is the amplitude of the function shown?', num(A), [num(2 * A), num(A + 1), num(p.c), num(A + p.c)], `Amplitude = (maximum − minimum) ÷ 2 = (${num(p.c + A)} − ${num(p.c - A)}) ÷ 2 = ${num(A)}.`, (i) => num(A + i + 1));
  mk('What is the period of the function shown?', `${num(period)}${deg}`, [`${num(period * 2)}${deg}`, `${num(period / 2)}${deg}`, `${num(360)}${deg}`, `${num(period + 90)}${deg}`], `The period is the length of one full cycle. Here one cycle takes ${num(period)}${deg}, so k = 360 ÷ ${num(period)} = ${num(p.k)}.`, (i) => `${num(period + 45 * i)}${deg}`);
  mk('What is the equation of the midline (the axis of the curve)?', `y = ${num(p.c)}`, [`y = ${num(-p.c)}`, `y = ${num(A)}`, `y = ${num(p.c + A)}`, `y = ${num(p.c + 1)}`], `The midline is halfway between the maximum (${num(p.c + A)}) and the minimum (${num(p.c - A)}): y = ${num(p.c)}.`, (i) => `y = ${num(p.c + i + 1)}`);
  const rg = ineq('y', p.c - A, p.c + A);
  mk('State the range of the function shown.', rg, [ineq('y', p.c - A + 1, p.c + A + 1), ineq('y', -A, A), 'all real numbers', ineq('y', p.c - 2 * A, p.c + 2 * A)], `The graph goes from a minimum of ${num(p.c - A)} to a maximum of ${num(p.c + A)}.`, (i) => ineq('y', p.c - A - i, p.c + A));
  const correct = sinText(p);
  const cands = [{ ...p, a: -p.a }, { ...p, k: p.k === 1 ? 2 : 1 }, { ...p, c: -p.c || 1 }, { ...p, d: p.d ? -p.d : 90 }, { ...p, a: p.a + 1 }, { ...p, fn: p.fn === 'sin' ? 'cos' : 'sin' }]
    .filter((q) => sinText(q) !== correct && !sameGraph({ type: q.fn, a: q.a, k: q.k, d: q.d, c: q.c }, f)).map(sinText);
  const w = [...new Set(cands)].slice(0, 3);
  if (w.length === 3) out.push({ kind: 'graph', topic, diagram, prompt: 'Which equation matches the graph?', answer: correct, wrong: w, explain: `a is the amplitude (${num(p.a)}), k = 360 ÷ period = ${num(p.k)}, c is the midline height (${num(p.c)})${p.d ? ` and the curve is shifted ${p.d}° to the right` : ''}.` });
  return out;
}

/* ================= exponential graphs and comparing function types ================= */

export function expProblems() {
  const a = pick([1, 2, 3, -1, -2]); const b = pick([2, 3, 0.5, 2, 0.5]); const k = pick([0, 0, -1, 1, -2, 2]);
  const f = { type: 'exp', a, b, k };
  const y0 = a + k;
  if (Math.abs(y0) > 5) return [];
  const diagram = { kind: 'graph', f, view: VIEW, label: 'Graph of an exponential function' };
  const out = []; const topic = 'Exponential functions';
  const inc = (a > 0 && b > 1) || (a < 0 && b < 1);
  out.push({
    kind: 'graph', topic, diagram, prompt: 'Is the exponential function shown increasing or decreasing?', answer: inc ? 'Increasing' : 'Decreasing', wrong: [inc ? 'Decreasing' : 'Increasing', 'Constant', 'Neither: it goes up then down'],
    explain: inc ? 'The curve rises from left to right.' : 'The curve falls from left to right.',
    tf: { q: 'The function shown is increasing.', answer: inc },
  });
  const ha = `y = ${num(k)}`;
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the equation of the horizontal asymptote?', answer: ha,
    wrong: withWrong(ha, [`y = ${num(-k)}`, 'x = 0', `y = ${num(k + 1)}`, `y = ${num(a)}`], (i) => `y = ${num(k + i + 1)}`),
    explain: 'The curve gets closer and closer to a horizontal line but never touches it. For y = a(b)ˣ + k that line is y = k.',
  });
  const yi = pointStr(0, y0);
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the y-intercept?', answer: yi, wrong: withWrong(yi, [pointStr(0, y0 + 1), pointStr(y0, 0), pointStr(0, -y0), pointStr(0, k)], (i) => pointStr(0, y0 + i + 1)),
    explain: `The graph crosses the y-axis at ${yi}.`,
  });
  const rg = a > 0 ? ineq('y', k, Infinity, true) : ineq('y', -Infinity, k, false, true);
  out.push({
    kind: 'graph', topic, diagram, prompt: 'State the range of the function shown.', answer: rg,
    wrong: withWrong(rg, [a > 0 ? ineq('y', -Infinity, k, false, true) : ineq('y', k, Infinity, true), 'all real numbers', a > 0 ? ineq('y', k, Infinity) : ineq('y', -Infinity, k)], (i) => ineq('y', k + i, Infinity, true)),
    explain: 'The curve stays above (or below) the horizontal asymptote and never reaches it, so y > k (or y < k).',
  });
  return out;
}

export function typeProblems() {
  const types = { Linear: { type: 'lin', m: pick([1, -1, 2]), b: rnd(-2, 2) }, Quadratic: { type: 'quad', a: pick([1, -1]), h: rnd(-2, 2), k: rnd(-2, 2) }, Exponential: { type: 'exp', a: 1, b: 2, k: pick([0, -1, 1]) } };
  const name = pick(Object.keys(types));
  const ans = name;
  return [{
    kind: 'graph', topic: 'Linear, quadratic or exponential', diagram: { kind: 'graph', f: types[name], view: VIEW }, prompt: 'Which type of function is shown?', answer: ans,
    wrong: [...Object.keys(types).filter((n) => n !== name), 'Square root'],
    explain: name === 'Linear' ? 'A straight line: constant rate of change.' : name === 'Quadratic' ? 'A parabola: the rate of change itself changes steadily.' : 'A curve that grows (or decays) by a constant factor and has a horizontal asymptote.',
  }];
}

/* ================= sequences and Pascal's triangle ================= */

export function sequenceProblems() {
  const out = []; const topic = 'Sequences';
  const arith = Math.random() < 0.55;
  let terms; let ans; let ansN; let label; let next; let explain;
  if (arith) {
    const a1 = rnd(-3, 5); const d = pick([-2, -1, 1, 2, 3]);
    terms = [0, 1, 2, 3, 4, 5].map((i) => a1 + d * i); ans = num(d); ansN = d; next = a1 + 6 * d; label = 'common difference';
    explain = `Each term is ${num(d)} more than the one before: t₂ − t₁ = ${num(terms[1])} − ${num(terms[0])} = ${num(d)}. This is an arithmetic sequence.`;
  } else {
    const a1 = pick([1, 2, 3]); const r = pick([2, 3, 0.5]); const aa = r === 0.5 ? 16 : a1;
    terms = [0, 1, 2, 3, 4].map((i) => aa * r ** i); ans = num(r); ansN = r; next = aa * r ** 5; label = 'common ratio';
    explain = `Each term is ${num(r)} times the one before: ${num(terms[1])} ÷ ${num(terms[0])} = ${num(r)}. This is a geometric sequence.`;
  }
  const lo = Math.min(...terms, 0) - 1; const hi = Math.max(...terms) + 2;
  const diagram = { kind: 'graph', discrete: true, view: [0, terms.length + 1, Math.floor(lo), Math.ceil(hi)], marks: terms.map((y, i) => ({ x: i + 1, y })), size: [340, 300], label: 'Graph of the first terms of a sequence' };
  out.push({
    kind: 'graph', topic, diagram, prompt: `The first terms of a sequence are plotted (n, tₙ). What is the ${label}?`, answer: ans,
    wrong: withWrong(ans, [num(arith ? -ansN : 1 / ansN), num(ansN + 1), num(ansN * 2), num(terms[0])], (i) => num(ansN + i + 1)),
    explain,
    fill: { q: `The ${label} is _____`, answer: ans },
  });
  const nx = num(next);
  out.push({
    kind: 'graph', topic, diagram, prompt: `What is the next term, t${terms.length + 1}, in the sequence plotted?`, answer: nx,
    wrong: withWrong(nx, [num(next + 1), num(next - 1), num(terms[terms.length - 1] + 1), num(next * 2)], (i) => num(next + i + 2)),
    explain: `${explain} So t${terms.length + 1} = ${nx}.`,
  });
  return out;
}

const pascalRows = (n) => { const r = [[1]]; for (let i = 1; i < n; i++) { const p = r[i - 1]; r.push(Array.from({ length: i + 1 }, (_, j) => (j === 0 || j === i ? 1 : p[j - 1] + p[j]))); } return r; };

export function pascalProblems() {
  const rows = rnd(7, 8); const values = pascalRows(rows);
  const r = rnd(3, rows - 1); const c = rnd(1, r - 1);
  const ans = values[r][c];
  const out = [{
    kind: 'graph', topic: "Pascal's triangle", diagram: { kind: 'pascal', rows, values, hide: [r, c] }, prompt: 'Which number goes in the circle marked "?"', answer: String(ans),
    wrong: withWrong(String(ans), [String(ans - 1), String(ans + 1), String(values[r][c - 1] ?? ans + 2), String(values[r - 1][c - 1] + 0)], (i) => String(ans + i + 1)),
    explain: `Each number is the sum of the two numbers above it: ${values[r - 1][c - 1]} + ${values[r - 1][c]} = ${ans}.`,
    fill: { q: 'The missing number is _____', answer: String(ans) },
  }];
  const n = rnd(3, 5);
  const rowTxt = (k) => values[k].join(' ');
  out.push({
    kind: 'graph', topic: "Pascal's triangle", diagram: { kind: 'pascal', rows, values, hide: null }, prompt: `Which row of Pascal's triangle gives the coefficients in the expansion of (x + y)^${n}? (The top row is row 0.)`, answer: rowTxt(n),
    wrong: [n - 1, n + 1, n - 2, n + 2].filter((k) => k >= 0 && k < rows).slice(0, 3).map(rowTxt),
    explain: `The coefficients of (x + y)^${n} are in row ${n}: ${rowTxt(n)}.`,
  });
  return out;
}


/* ================= a line and a parabola (linear-quadratic systems) ================= */

export function linQuadProblems() {
  const topic = 'Line and parabola'; const out = [];
  for (let tries = 0; tries < 80; tries++) {
    const mode = pick(['two', 'two', 'one', 'none']);
    const a = pick([1, -1]); const h = rnd(-3, 3); const k = rnd(-3, 3);
    const par = { type: 'quad', a, h, k };
    let line;
    if (mode === 'two') {
      const x1 = rnd(-4, 4); const x2 = rnd(-4, 4); if (x1 === x2) continue;
      const y1 = evalF(par, x1); const y2 = evalF(par, x2);
      const m = (y2 - y1) / (x2 - x1); const b = y1 - m * x1;
      if (!Number.isInteger(m) || !Number.isInteger(b) || Math.abs(b) > 5 || Math.abs(m) > 4 || Math.abs(y1) > 5 || Math.abs(y2) > 5) continue;
      line = { type: 'lin', m, b };
    } else if (mode === 'one') line = { type: 'lin', m: 0, b: k };
    else { const b = a > 0 ? k - rnd(1, 2) : k + rnd(1, 2); if (Math.abs(b) > 5) continue; line = { type: 'lin', m: 0, b }; }
    // count the intersections exactly from the discriminant of a(x-h)^2 + k = mx + b
    const A = a; const B = -2 * a * h - line.m; const C = a * h * h + k - line.b;
    const disc = B * B - 4 * A * C;
    const count = disc > 1e-9 ? 2 : Math.abs(disc) <= 1e-9 ? 1 : 0;
    const names = ['0', '1', '2'];
    const diagram = { kind: 'graph', f: par, curves: [{ f: line, color: 'accent' }], view: VIEW, label: 'A parabola and a line' };
    out.push({
      kind: 'graph', topic, diagram, prompt: 'How many points of intersection do the parabola and the line have?', answer: names[count],
      wrong: names.filter((n) => n !== names[count]).concat(['3']),
      explain: count === 2 ? 'The line crosses the parabola at two points.' : count === 1 ? 'The line just touches the parabola at one point (a tangent), at its vertex.' : 'The line never meets the parabola, so there are no points of intersection.',
    });
    if (count === 2) {
      const r1 = (-B - Math.sqrt(disc)) / (2 * A); const r2 = (-B + Math.sqrt(disc)) / (2 * A);
      const xsol = [r1, r2].sort((p, q) => p - q);
      if (!xsol.every((x) => Number.isInteger(Math.round(x * 1e6) / 1e6))) continue;
      const pts = xsol.map((x) => [Math.round(x), evalF(line, Math.round(x))]);
      const ans = pts.map(([x, y]) => pointStr(x, y)).join(' and ');
      out.push({
        kind: 'graph', topic, diagram: { ...diagram, marks: pts.map(([x, y]) => ({ x, y, color: 'good' })) }, prompt: 'State the points of intersection of the line and the parabola.', answer: ans,
        wrong: withWrong(ans, [pts.map(([x, y]) => pointStr(y, x)).join(' and '), pts.map(([x, y]) => pointStr(-x, y)).join(' and '), pts.map(([x, y]) => pointStr(x, -y)).join(' and '), pts.map(([x, y]) => pointStr(x, y + 1)).join(' and ')], (i) => pts.map(([x, y]) => pointStr(x + i, y)).join(' and ')),
        explain: 'Set the two equations equal and solve (substitution), or read where the graphs cross. Each solution x gives a point on the line.',
      });
    }
    break;
  }
  return out;
}


/* ================= Unit 1 and 2: algebraic areas, radicals, discriminant, parabola word graphs ================= */

const linTerm = (a, b) => `${a === 1 ? 'x' : a === -1 ? `${MINUS}x` : `${num(a)}x`}${b ? signed(b) : ''}`;
function polyText(A, B, C) {
  const terms = [[A, 'x²'], [B, 'x'], [C, '']].filter(([c]) => c !== 0);
  if (!terms.length) return '0';
  return terms.map(([c, v], i) => {
    const abs = Math.abs(c); const body = abs === 1 && v ? v : `${abs}${v}`;
    return i === 0 ? `${c < 0 ? MINUS : ''}${body}` : ` ${c < 0 ? MINUS : '+'} ${body}`;
  }).join('');
}
const simp = (n) => { let k = 1; let m = n; for (let f = 2; f * f <= m; f++) while (m % (f * f) === 0) { m /= f * f; k *= f; } return [k, m]; };
const radText = (k, m) => (m === 1 ? String(k) : k === 1 ? `√${m}` : `${k}√${m}`);

export function algAreaProblems() {
  const out = []; const topic = 'Areas with algebra';
  // rectangle with binomial sides
  const a = rnd(1, 3); const c = rnd(1, 3); const b = pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]); const d = pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]);
  const A = a * c; const B = a * d + b * c; const C = b * d;
  const ans = polyText(A, B, C);
  const wr = [polyText(A, a * d - b * c, C), polyText(A, B, -C), polyText(A, a * d + b * c + 1, C), polyText(a + c, B, C), polyText(A, a * d + c * b, b + d)].filter((x) => x !== ans);
  out.push({
    kind: 'graph', topic, diagram: { kind: 'shape', shape: 'rect', w: linTerm(a, b), h: linTerm(c, d) },
    prompt: 'The sides of the rectangle are shown. Which expression gives its area, fully expanded?', answer: ans,
    wrong: withWrong(ans, [...new Set(wr)], (i) => polyText(A, B + i, C)),
    explain: `Area = length × width = (${linTerm(a, b)})(${linTerm(c, d)}). Multiply each term: ${polyText(A, B, C)}.`,
  });
  // one triangle: area = 1/2 base x height (base has even coefficients so the half works out)
  const p = rnd(1, 3); const q = pick([-3, -2, -1, 1, 2, 3]); const r = rnd(1, 3); const t = pick([-4, -3, -2, -1, 1, 2, 3, 4]);
  const TA = p * r; const TB = p * t + q * r; const TC = q * t;
  const tAns = polyText(TA, TB, TC);
  out.push({
    kind: 'graph', topic, diagram: { kind: 'shape', shape: 'triangles', tris: [{ base: linTerm(2 * p, 2 * q), height: linTerm(r, t) }] },
    prompt: 'Which expression gives the area of the triangle? (Area = ½ × base × height; expand fully.)', answer: tAns,
    wrong: withWrong(tAns, [...new Set([polyText(2 * TA, 2 * TB, 2 * TC), polyText(TA, p * t - q * r, TC), polyText(TA, TB, -TC), polyText(TA, TB + 1, TC)])].filter((x) => x !== tAns), (i) => polyText(TA, TB + i, TC)),
    explain: `½(${linTerm(2 * p, 2 * q)})(${linTerm(r, t)}) = (${linTerm(p, q)})(${linTerm(r, t)}) = ${tAns}.`,
  });
  // ratio of the areas of two triangles that share factors
  const pb = rnd(1, 2); const qb = pick([-3, -2, 2, 3]); const rb = rnd(1, 2); const sb = pick([2, 3, 4]);
  const c1 = pick([2, 3]); const d1 = pick([2, 3]); const d2 = pick([1, 2, 3].filter((v) => v !== d1));
  const base = linTerm(pb, qb); const hgt = linTerm(rb, sb);
  const k = frac(c1 * d1, d2);
  const mulT = (m, a0, b0) => linTerm(m * a0, m * b0);
  out.push({
    kind: 'graph', topic,
    diagram: { kind: 'shape', shape: 'triangles', tris: [{ name: 'ABC', base: mulT(c1, pb, qb), height: mulT(d1, rb, sb) }, { name: 'DEF', base, height: mulT(d2, rb, sb) }] },
    prompt: 'Write the ratio of the area of triangle ABC to the area of triangle DEF in simplest form.', answer: k,
    wrong: withWrong(k, [frac(d2, c1 * d1), frac(c1, d2), frac(d1, d2), frac(c1 * d1 + 1, d2), String(c1 * d1)].filter((x) => x !== k), (i) => frac(c1 * d1 + i, d2)),
    explain: `Area ABC = ½(${mulT(c1, pb, qb)})(${mulT(d1, rb, sb)}) and Area DEF = ½(${base})(${mulT(d2, rb, sb)}). The factors (${base}) and (${hgt}) cancel, leaving ${c1}·${d1} ÷ ${d2} = ${k}.`,
  });
  return out;
}

export function radShapeProblems() {
  const out = []; const topic = 'Radicals in shapes';
  const R = [2, 3, 5, 6, 7, 10];
  const val = (coef, r) => coef * Math.sqrt(r);
  const wrongRad = (correct, cands) => { const cv = val(correct[0], correct[1]); return cands.filter(([k, m]) => m >= 1 && Math.abs(val(k, m) - cv) > 1e-9).map(([k, m]) => radText(k, m)); };
  // rectangle p√m by q√n
  { const p = rnd(1, 4); const q = rnd(1, 4); const m = pick(R); const n = pick(R);
    const [kk, rr] = simp(m * n); const coef = p * q * kk; const ans = radText(coef, rr);
    out.push({
      kind: 'graph', topic, diagram: { kind: 'shape', shape: 'rect', w: radText(p, m), h: radText(q, n) },
      prompt: 'Find the area of the rectangle in simplest radical form.', answer: ans,
      wrong: withWrong(ans, wrongRad([coef, rr], [[p * q, m + n], [p + q, m * n], [coef, rr + 1], [coef + 1, rr], [p * q * m, n]]), (i) => radText(coef + i, rr)),
      explain: `Area = (${radText(p, m)})(${radText(q, n)}) = ${p * q}√${m * n}${kk > 1 ? ` = ${p * q}(${kk})√${rr}` : ''} = ${ans}.`,
      check: { kind: 'rect', coef, r: rr, p, q, m, n },
    }); }
  // right triangle with radical legs (one coefficient even so the half is whole)
  { const p = pick([2, 4]); const q = rnd(1, 3); const m = pick(R); const n = pick(R);
    const [kk, rr] = simp(m * n); const coef = (p * q * kk) / 2; const ans = radText(coef, rr);
    const la = p * Math.sqrt(m); const lb = q * Math.sqrt(n);
    out.push({
      kind: 'graph', topic, diagram: { kind: 'tri', pts: [[0, lb], [la, 0], [0, 0]], v: ['', '', ''], right: 2, sides: [radText(p, m), radText(q, n), ''] },
      prompt: 'The legs of the right triangle are shown. Find its area in simplest radical form.', answer: ans,
      wrong: withWrong(ans, wrongRad([coef, rr], [[p * q * kk, rr], [coef, rr + 1], [coef * 2 + 1, rr], [p * q, m + n], [coef + 1, rr]]), (i) => radText(coef + i, rr)),
      explain: `Area = ½ × (${radText(p, m)}) × (${radText(q, n)}) = ½(${p * q})√${m * n} = ${ans}.`,
      check: { kind: 'tri', coef, r: rr, p, q, m, n },
    }); }
  // square with side k√m
  { const k0 = rnd(2, 4); const m = pick(R); const ans = String(k0 * k0 * m);
    out.push({
      kind: 'graph', topic, diagram: { kind: 'shape', shape: 'square', s: radText(k0, m) },
      prompt: 'Find the area of the square. (All sides are equal.)', answer: ans,
      wrong: withWrong(ans, [String(k0 * k0 * Math.sqrt(m) | 0), String(k0 * m), String(2 * k0 * m), String(k0 * k0), String(k0 * k0 * m * m)].filter((x) => x !== ans), (i) => String(k0 * k0 * m + i)),
      explain: `Area = side² = (${radText(k0, m)})² = ${k0}² × ${m} = ${ans}.`,
      check: { kind: 'square', area: k0 * k0 * m },
    }); }
  // circle with radius √m
  { const m = pick(R); const ans = `${m}π`;
    out.push({
      kind: 'graph', topic, diagram: { kind: 'shape', shape: 'circle', r: `r = √${m}` },
      prompt: 'Find the exact area of the circle.', answer: ans,
      wrong: withWrong(ans, [`${m * m}π`, `${2 * m}π`, `π√${m}`, `${m}π²`], (i) => `${m + i}π`),
      explain: `Area = πr² = π(√${m})² = ${ans}.`,
      check: { kind: 'circle', m },
    }); }
  return out;
}

export function discriminantProblems() {
  const a = pick([1, -1, 2, -2, 0.5, -0.5]); const h = rnd(-3, 3);
  const mode = pick(['two', 'one', 'none']);
  const kk = mode === 'one' ? 0 : a > 0 ? (mode === 'two' ? -rnd(1, 4) : rnd(1, 4)) : (mode === 'two' ? rnd(1, 4) : -rnd(1, 4));
  const f = { type: 'quad', a, h, k: kk };
  const count = mode === 'two' ? 2 : mode === 'one' ? 1 : 0;
  const diagram = { kind: 'graph', f, view: VIEW };
  const topic = 'Nature of the roots';
  const signA = count === 2 ? 'Positive: b² − 4ac > 0' : count === 1 ? 'Zero: b² − 4ac = 0' : 'Negative: b² − 4ac < 0';
  const signs = ['Positive: b² − 4ac > 0', 'Zero: b² − 4ac = 0', 'Negative: b² − 4ac < 0'];
  const out = [];
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the sign of the discriminant (b² − 4ac) of this quadratic function?', answer: signA,
    wrong: [...signs.filter((x) => x !== signA), 'It cannot be found from a graph'],
    explain: count === 2 ? 'The graph crosses the x-axis twice: two real roots, so the discriminant is positive.' : count === 1 ? 'The graph just touches the x-axis once: one real root (a double root), so the discriminant is zero.' : 'The graph never touches the x-axis: no real roots, so the discriminant is negative.',
  });
  out.push({
    kind: 'graph', topic, diagram, prompt: 'How many real roots (x-intercepts) does this quadratic have?', answer: String(count),
    wrong: ['0', '1', '2', '3'].filter((x) => x !== String(count)),
    explain: 'Real roots are the x-intercepts: where the graph meets the horizontal axis.',
    tf: { q: 'This quadratic has two different real roots.', answer: count === 2 },
  });
  return out;
}

export function quadReadProblems() {
  const [a, dd] = pick([[-1, 4], [-1, 6], [-1, 8], [-2, 4], [-2, 6]]);
  const r1 = rnd(-3, 0); const r2 = r1 + dd;
  const f = { type: 'quad', a, h: (r1 + r2) / 2, k: (-a * dd * dd) / 4 };
  const vx = (r1 + r2) / 2; const vy = f.k;
  const y0 = evalF(f, 0);
  const lo = Math.min(-1, r1 - 1); const hi = r2 + 1;
  const diagram = { kind: 'graph', f, view: [lo, hi, -Math.ceil(vy / 3), vy + 2], xlabel: 't (s)', ylabel: 'h (m)', size: [380, 320], from: r1 - 1, to: r2 + 1, label: 'Height of an object over time' };
  const topic = 'Parabolas in context'; const out = [];
  const fin = (ans, wr, expl, filler) => ({ kind: 'graph', topic, diagram, answer: ans, wrong: withWrong(ans, wr, filler), explain: expl });
  out.push({ ...fin(`${num(vy)} m`, [`${num(vx)} m`, `${num(vy + 2)} m`, `${num(y0)} m`, `${num(r2)} m`], `The maximum height is the y-value of the vertex: ${num(vy)} m.`, (i) => `${num(vy + i + 2)} m`), prompt: 'The graph shows height h (metres) against time t (seconds). What is the maximum height?' });
  out.push({ ...fin(`${num(vx)} s`, [`${num(vy)} s`, `${num(r2)} s`, `${num(vx + 1)} s`, `${num(r1)} s`], `The maximum happens at the vertex, at t = ${num(vx)} s (halfway between the roots).`, (i) => `${num(vx + i + 1)} s`), prompt: 'At what time does the object reach its maximum height?' });
  out.push({ ...fin(`${num(r2)} s`, [`${num(r1)} s`, `${num(vx)} s`, `${num(r2 + 1)} s`, `${num(vy)} s`], `The object lands when h = 0 again: at the right-hand x-intercept, t = ${num(r2)} s.`, (i) => `${num(r2 + i + 1)} s`), prompt: 'When does the object hit the ground? (When is h = 0 for t > 0?)' });
  if (y0 > 0) out.push({ ...fin(`${num(y0)} m`, [`${num(vy)} m`, '0 m', `${num(y0 + 2)} m`, `${num(-y0)} m`], `The starting height is the h-intercept (t = 0): ${num(y0)} m.`, (i) => `${num(y0 + i + 3)} m`), prompt: 'From what height was the object launched? (the h-intercept)' });
  return out;
}

const PW_PROMPT = 'State the domain and range of the graph shown. (A hollow dot means the point is not included.)';
export function drProblems() {
  const topic = 'Domain and range from graphs'; const out = [];
  const kind = pick(['pw', 'pw', 'pw', 'vert', 'horz']);
  if (kind === 'vert') {
    const c = rnd(-4, 4);
    out.push({ kind: 'graph', topic, diagram: { kind: 'graph', rel: { type: 'vert', x: c }, view: VIEW }, prompt: 'State the domain and range of the relation shown.', answer: both(`x = ${num(c)}`, 'all real numbers'),
      wrong: [both('all real numbers', `y = ${num(c)}`), both('all real numbers', 'all real numbers'), both(`x = ${num(c)}`, `y = ${num(c)}`)],
      explain: `Every point has x = ${num(c)}, so the domain is just {${num(c)}}. The line goes up and down forever, so the range is all real numbers. It is not a function.`,
      tf: { q: 'This vertical line is a function.', answer: false } });
    return out;
  }
  if (kind === 'horz') {
    const c = rnd(-4, 4);
    out.push({ kind: 'graph', topic, diagram: { kind: 'graph', rel: { type: 'horz', y: c }, view: VIEW }, prompt: 'State the domain and range of the relation shown.', answer: both('all real numbers', `y = ${num(c)}`),
      wrong: [both(`x = ${num(c)}`, 'all real numbers'), both('all real numbers', 'all real numbers'), both(`x = ${num(c)}`, `y = ${num(c)}`)],
      explain: `The line goes left and right forever, so the domain is all real numbers. Every y-value is ${num(c)}, so the range is {${num(c)}}. It is a function.`,
      tf: { q: 'This horizontal line is a function.', answer: true } });
    return out;
  }
  for (let tries = 0; tries < 60; tries++) {
    const xs = shuffle([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]).slice(0, 3).sort((p, q) => p - q);
    if (xs[1] - xs[0] < 1 || xs[2] - xs[1] < 1) continue;
    const ys = [rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)];
    if (new Set(ys).size < 3) continue;
    const open0 = Math.random() < 0.4; const open2 = Math.random() < 0.4;
    const closed = [!open0, true, !open2];
    const lo = Math.min(...ys); const hi = Math.max(...ys);
    const loOpen = !ys.some((y, i) => y === lo && closed[i]); const hiOpen = !ys.some((y, i) => y === hi && closed[i]);
    const dom = ineq('x', xs[0], xs[2], open0, open2); const rg = ineq('y', lo, hi, loOpen, hiOpen);
    const ans = both(dom, rg);
    const pts = xs.map((x, i) => [x, ys[i]]);
    out.push({
      kind: 'graph', topic, diagram: { kind: 'graph', f: { type: 'pw', pts }, view: VIEW, marks: pts.map(([x, y], i) => ({ x, y, open: !closed[i], color: 'primary' })) }, prompt: PW_PROMPT, answer: ans,
      wrong: withWrong(ans, [both(ineq('x', xs[0], xs[2], !open0, open2), rg), both(dom, ineq('y', lo, hi, !loOpen, hiOpen)), both(rg.replace(/y/g, 'x'), dom.replace(/x/g, 'y')), both(dom, ineq('y', Math.min(ys[0], ys[2]), Math.max(ys[0], ys[2]), open0, open2))], (i) => both(ineq('x', xs[0], xs[2] + i, open0, open2), rg)),
      explain: 'The domain is the x-values the graph covers, left to right; the range is the y-values it covers, bottom to top. A hollow dot is not included (use < or >); a filled dot is included (use ≤ or ≥).',
      check: { pts, closed, lo, hi, loOpen, hiOpen },
    });
    return out;
  }
  return out;
}

/* ================= angles of elevation and depression ================= */

export function elevProblems() {
  const out = []; const topic = 'Elevation and depression'; const t1 = (d) => Math.tan((d * Math.PI) / 180);
  const mode = pick(['elev-h', 'elev-d', 'dep-d', 'dep-h']);
  const ang = rnd(20, 60);
  if (mode === 'elev-h' || mode === 'dep-h') {
    const d = pick([20, 25, 30, 40, 50, 60]); const h = d * t1(ang); const ans = `${round1(h)} m`;
    out.push({
      kind: 'graph', topic,
      diagram: { kind: 'elev', type: mode === 'elev-h' ? 'elevation' : 'depression', angle: ang, hLabel: 'h = ?', dLabel: `${d} m` },
      prompt: mode === 'elev-h' ? `From a point ${d} m from the base of a tower, the angle of elevation to the top is ${ang}°. How tall is the tower, to the nearest tenth?` : `A person on a cliff sees a boat ${d} m out from the base of the cliff at an angle of depression of ${ang}°. How high is the cliff, to the nearest tenth?`,
      answer: ans, wrong: withWrong(ans, [`${round1(d * Math.sin((ang * Math.PI) / 180))} m`, `${round1(d * Math.cos((ang * Math.PI) / 180))} m`, `${round1(d / t1(ang))} m`, `${round1(d * t1(90 - ang) / 1.2)} m`], (i) => `${round1(h + i * 2.3)} m`),
      explain: `The height is opposite the angle and the distance ${d} m is adjacent, so tan ${ang}° = h ÷ ${d} and h = ${d} × tan ${ang}° ≈ ${round1(h)} m.${mode === 'dep-h' ? ' (The angle of depression from the cliff equals the angle of elevation from the boat.)' : ''}`,
      fill: { q: `h ≈ _____ m (to the nearest tenth)`, answer: round1(h) },
    });
  } else {
    const h = pick([12, 15, 20, 30, 45]); const d = h / t1(ang); const ans = `${round1(d)} m`;
    out.push({
      kind: 'graph', topic,
      diagram: { kind: 'elev', type: mode === 'elev-d' ? 'elevation' : 'depression', angle: ang, hLabel: `${h} m`, dLabel: 'd = ?' },
      prompt: mode === 'elev-d' ? `A ${h} m tower is seen at an angle of elevation of ${ang}°. How far is the observer from the base of the tower, to the nearest tenth?` : `From the top of a ${h} m cliff, the angle of depression to a boat is ${ang}°. How far is the boat from the base of the cliff, to the nearest tenth?`,
      answer: ans, wrong: withWrong(ans, [`${round1(h * t1(ang))} m`, `${round1(h / Math.sin((ang * Math.PI) / 180))} m`, `${round1(h * Math.cos((ang * Math.PI) / 180))} m`, `${round1(h / t1(90 - ang) * 1.1)} m`], (i) => `${round1(d + i * 2.7)} m`),
      explain: `tan ${ang}° = ${h} ÷ d, so d = ${h} ÷ tan ${ang}° ≈ ${round1(d)} m.`,
    });
  }
  // two observation points
  const a1 = rnd(22, 38); const a2 = rnd(a1 + 12, 62); const sep = pick([10, 15, 20, 25, 30]);
  const hh = sep / (1 / t1(a1) - 1 / t1(a2)); const hAns = `${round1(hh)} m`;
  out.push({
    kind: 'graph', topic, diagram: { kind: 'elev', type: 'two', angle: a1, angle2: a2, hLabel: 'h = ?', sLabel: `${sep} m` },
    prompt: `Points A and B are ${sep} m apart in line with a tower. The angle of elevation of the top is ${a1}° from A and ${a2}° from B. How tall is the tower, to the nearest tenth?`, answer: hAns,
    wrong: withWrong(hAns, [`${round1(sep * t1(a2))} m`, `${round1(sep * t1(a1))} m`, `${round1(sep * Math.sin((a1 * Math.PI) / 180))} m`, `${round1(hh * 0.6)} m`], (i) => `${round1(hh + i * 3.1)} m`),
    explain: `Let the distance from B to the base be x. Then h = x tan ${a2}° and h = (x + ${sep}) tan ${a1}°. Solving gives h = ${sep} ÷ (1/tan ${a1}° − 1/tan ${a2}°) ≈ ${round1(hh)} m.`,
  });
  out.push({
    kind: 'graph', topic, diagram: { kind: 'elev', type: 'depression', angle: ang, hLabel: 'h', dLabel: 'd' }, prompt: 'The angle of depression from the top of a cliff to a boat is θ. What is the angle of elevation from the boat to the top of the cliff?', answer: 'θ (the same angle)',
    wrong: ['90° − θ', '180° − θ', '2θ'], explain: 'The horizontal lines are parallel, so the angle of depression and the angle of elevation are alternate angles and are equal.',
    tf: { q: 'The angle of depression from the cliff equals the angle of elevation from the boat.', answer: true },
  });
  return out;
}

export const MATH = {
  read: readProblems, vlt: vltProblems, circle: circleProblems, mapping: mappingProblems, transform: transformProblems, inverse: inverseProblems,
  rtri: rightTriProblems, special: specialProblems, std: angleProblems, unitcircle: unitCircleProblems, oblique: obliqueProblems, ambig: ambiguousProblems,
  sinus: sinusoidProblems, linquad: linQuadProblems, algarea: algAreaProblems, radshape: radShapeProblems, disc: discriminantProblems, quadread: quadReadProblems, drpiece: drProblems, elev: elevProblems, exp: expProblems, ftype: typeProblems, seq: sequenceProblems, pascal: pascalProblems,
};
