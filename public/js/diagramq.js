// Diagram questions and cards, made by code (not the AI) so the picture and the answer always agree.
// Quizzes and cue cards call diagramQuestions() / diagramCards() with the student's notes; if the notes
// are about cells or about functions, a few questions that need a diagram are added.
import { BIO, evalF } from './diagrams.js';
import { GENERATORS, detectExtra, densityOf } from './diagramtopics.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const clean = (n) => Math.round(n * 100) / 100;
const num = (n) => String(clean(n)).replace('-', '−');
const unique = (list, correct) => [...new Set(list)].filter((x) => x !== correct);

/* ---------------- topic detection ---------------- */

const count = (text, words) => new Set((text.match(words) || []).map((w) => w.toLowerCase())).size;

export function detect(text) {
  const t = text || '';
  const out = { bio: [], graph: [], extra: detectExtra(text || '') };
  const animal = count(t, /\b(cells?|organelles?|nucle(?:us|i)|mitochondri\w*|ribosom\w*|golgi|lysosom\w*|endoplasmic|cytoplasm|centriol\w*|cell membrane)\b/gi);
  const plant = count(t, /\b(chloroplasts?|cell walls?|vacuoles?|plant cells?)\b/gi);
  const neuron = count(t, /\b(neurons?|axons?|dendrites?|myelin|synapses?|ranvier|nervous system)\b/gi);
  if (neuron >= 2) out.bio.push('neuron');
  if (count(t, /\b(dna|nucleotides?|double helix|phosphate groups?|deoxyribose|nitrogenous bases?|base pairs?|hydrogen bonds?)\b/gi) >= 2) out.bio.push('dna');
  if (count(t, /\b(virus(es)?|viral|capsid|bacteriophages?|phages?|lytic|lysogenic|envelope|spike proteins?)\b/gi) >= 2) out.bio.push(/phage/i.test(t) ? 'phage' : 'virus');
  if (count(t, /\b(bacteri\w+|prokaryot\w*|flagell\w+|plasmids?|capsules?|nucleoid|pili|pilus|coccus|cocci|bacillus|bacilli)\b/gi) >= 2) out.bio.push('bacterium');
  if (count(t, /\b(flowers?|petals?|sepals?|stamens?|pistils?|carpels?|anthers?|filaments?|stigma|ovary|ovules?|receptacle)\b/gi) >= 2) out.bio.push('flower');
  if (count(t, /\b(fung(i|us|al)|hyph\w+|mycel\w+|mushrooms?|gills|stipe|spores?)\b/gi) >= 2) out.bio.push('mushroom');
  if (plant >= 1) out.bio.push('plant-cell');
  if (animal >= 2 && (plant === 0 || /animal cells?/i.test(t))) out.bio.push('animal-cell');

  const math = count(t, /\b(domain|range|parabolas?|quadratics?|asymptotes?|vertex|intercepts?|reciprocal function|absolute value|square root function|radical function|linear function|f\(x\)|function notation)\b/gi);
  if (math >= 2) {
    const fam = [];
    if (/parabola|quadratic|vertex/i.test(t)) fam.push('quad');
    if (/square root|radical/i.test(t)) fam.push('sqrt');
    if (/absolute value/i.test(t)) fam.push('abs');
    if (/reciprocal|rational|asymptote/i.test(t)) fam.push('recip');
    if (/linear|slope/i.test(t)) fam.push('lin');
    out.graph = fam.length ? fam : ['quad', 'sqrt', 'abs', 'recip', 'lin'];
  }
  return out;
}

/* ---------------- function graphs ---------------- */

const ineq = (v, lo, hi, loOpen, hiOpen) => {
  if (lo === -Infinity && hi === Infinity) return 'all real numbers';
  if (lo === -Infinity) return `${v} ${hiOpen ? '<' : '≤'} ${num(hi)}`;
  if (hi === Infinity) return `${v} ${loOpen ? '>' : '≥'} ${num(lo)}`;
  return `${num(lo)} ${loOpen ? '<' : '≤'} ${v} ${hiOpen ? '<' : '≤'} ${num(hi)}`;
};
const both = (dom, rng) => `Domain: ${dom}; Range: ${rng}`;

// The set of y-values a continuous function takes on [from, to] (ends open or closed).
export function rangeOn(f, from, to, fromOpen, toOpen) {
  const cands = [{ x: from, incl: !fromOpen }, { x: to, incl: !toOpen }];
  if ((f.type === 'quad' || f.type === 'abs') && f.h > from && f.h < to) cands.push({ x: f.h, incl: true });
  const vals = cands.map((c) => ({ ...c, y: evalF(f, c.x) }));
  const min = Math.min(...vals.map((v) => v.y));
  const max = Math.max(...vals.map((v) => v.y));
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  return {
    lo: min, hi: max,
    loOpen: !vals.some((v) => near(v.y, min) && v.incl),
    hiOpen: !vals.some((v) => near(v.y, max) && v.incl),
  };
}

const withWrong = (correct, wrong, filler) => {
  const w = unique(wrong, correct);
  let i = 1;
  while (w.length < 3) { const x = filler(i++); if (x !== correct && !w.includes(x)) w.push(x); }
  return w.slice(0, 3);
};

const pointStr = (x, y) => `(${num(x)}, ${num(y)})`;

function quadProblems() {
  const a = pick([1, -1, 2, -2, 0.5, -0.5]);
  const h = rnd(-3, 3);
  const k = rnd(-4, 4);
  const f = { type: 'quad', a, h, k };
  const sign = a > 0;
  const rngStr = sign ? ineq('y', k, Infinity, false, false) : ineq('y', -Infinity, k, false, false);
  const rngOpp = sign ? ineq('y', -Infinity, k, false, false) : ineq('y', k, Infinity, false, false);
  const diagram = { kind: 'graph', f, view: [-6, 6, -6, 6] };
  const out = [];

  const ans = both('all real numbers', rngStr);
  out.push({
    kind: 'graph', diagram, prompt: 'State the domain and range of the function shown.', answer: ans,
    wrong: withWrong(ans, [both('all real numbers', rngOpp), both(ineq('x', h, Infinity, false, false), 'all real numbers'), both('all real numbers', sign ? ineq('y', h, Infinity, false, false) : ineq('y', -Infinity, h, false, false))], (i) => both('all real numbers', ineq('y', k + i, Infinity, false, false))),
    explain: `The parabola is defined for every x, and its vertex at ${pointStr(h, k)} is the ${sign ? 'lowest' : 'highest'} point.`,
    check: { dom: [-Infinity, Infinity, false, false], rng: sign ? [k, Infinity, false, false] : [-Infinity, k, false, false], f },
  });
  const v = pointStr(h, k);
  out.push({
    kind: 'graph', diagram, prompt: 'What are the coordinates of the vertex of the parabola shown?', answer: v,
    wrong: withWrong(v, [pointStr(k, h), pointStr(-h, k), pointStr(h, -k)], (i) => pointStr(h + i, k)),
    explain: `The turning point of the curve is at ${v}.`,
  });
  const ax = `x = ${num(h)}`;
  out.push({
    kind: 'graph', diagram, prompt: 'What is the equation of the axis of symmetry of the parabola shown?', answer: ax,
    wrong: withWrong(ax, [`y = ${num(k)}`, `x = ${num(-h)}`, `x = ${num(k)}`], (i) => `x = ${num(h + i)}`),
    explain: `The axis of symmetry is the vertical line through the vertex, ${ax}.`,
  });

  // the same parabola cut to part of its domain
  const d1 = rnd(1, 3); const d2 = rnd(1, 3);
  const from = Math.max(-5, h - d1); const to = Math.min(5, h + d2);
  const fromOpen = Math.random() < 0.3; const toOpen = Math.random() < 0.3;
  if (from < to) {
    const r = rangeOn(f, from, to, fromOpen, toOpen);
    if (Math.abs(r.lo) <= 5.5 && Math.abs(r.hi) <= 5.5 && Math.abs(evalF(f, from)) <= 5.5 && Math.abs(evalF(f, to)) <= 5.5) {
      const dom = ineq('x', from, to, fromOpen, toOpen);
      const rg = ineq('y', r.lo, r.hi, r.loOpen, r.hiOpen);
      const answer = both(dom, rg);
      out.push({
        kind: 'graph', diagram: { kind: 'graph', f, from, to, fromOpen, toOpen, view: [-6, 6, -6, 6] },
        prompt: 'State the domain and range of the function shown.', answer,
        wrong: withWrong(answer, [
          both(ineq('x', from, to, !fromOpen, toOpen), rg),
          both(dom, ineq('y', r.lo, r.hi, !r.loOpen, r.hiOpen)),
          both(rg.replace(/y/g, 'x'), dom.replace(/x/g, 'y')),
          both(dom, ineq('y', evalF(f, from), evalF(f, to), fromOpen, toOpen)),
        ], (i) => both(dom, ineq('y', r.lo, r.hi + i, r.loOpen, r.hiOpen))),
        explain: 'Read the x-values the graph covers for the domain and the lowest to highest y-values for the range. A hollow dot means the end value is not included.',
        check: { dom: [from, to, fromOpen, toOpen], rng: [r.lo, r.hi, r.loOpen, r.hiOpen], f },
      });
    }
  }
  return out;
}

function absProblems() {
  const a = pick([1, -1, 2, -2]);
  const h = rnd(-3, 3);
  const k = rnd(-4, 4);
  const f = { type: 'abs', a, h, k };
  const up = a > 0;
  const rngStr = up ? ineq('y', k, Infinity, false, false) : ineq('y', -Infinity, k, false, false);
  const rngOpp = up ? ineq('y', -Infinity, k, false, false) : ineq('y', k, Infinity, false, false);
  const diagram = { kind: 'graph', f, view: [-6, 6, -6, 6] };
  const ans = both('all real numbers', rngStr);
  const v = pointStr(h, k);
  return [
    {
      kind: 'graph', diagram, prompt: 'State the domain and range of the function shown.', answer: ans,
      wrong: withWrong(ans, [both('all real numbers', rngOpp), both(ineq('x', h, Infinity, false, false), 'all real numbers'), both('all real numbers', up ? ineq('y', h, Infinity, false, false) : ineq('y', -Infinity, h, false, false))], (i) => both('all real numbers', ineq('y', k + i, Infinity, false, false))),
      explain: `Every x-value works, and the point of the V at ${v} is the ${up ? 'lowest' : 'highest'} point.`,
      check: { dom: [-Infinity, Infinity, false, false], rng: up ? [k, Infinity, false, false] : [-Infinity, k, false, false], f },
    },
    {
      kind: 'graph', diagram, prompt: 'What are the coordinates of the vertex of the graph shown?', answer: v,
      wrong: withWrong(v, [pointStr(k, h), pointStr(-h, k), pointStr(h, -k)], (i) => pointStr(h + i, k)),
      explain: `The sharp turning point is at ${v}.`,
    },
  ];
}

function sqrtProblems() {
  const a = pick([1, -1, 2, -2]);
  const h = rnd(-3, 3);
  const k = rnd(-3, 3);
  const f = { type: 'sqrt', a, h, k };
  const up = a > 0;
  const dom = ineq('x', h, Infinity, false, false);
  const rg = up ? ineq('y', k, Infinity, false, false) : ineq('y', -Infinity, k, false, false);
  const rgOpp = up ? ineq('y', -Infinity, k, false, false) : ineq('y', k, Infinity, false, false);
  const ans = both(dom, rg);
  return [{
    kind: 'graph', diagram: { kind: 'graph', f, view: [-6, 6, -6, 6] }, prompt: 'State the domain and range of the function shown.', answer: ans,
    wrong: withWrong(ans, [both(dom, rgOpp), both(ineq('x', -Infinity, h, false, false), rg), both(rg.replace('y', 'x'), dom.replace('x', 'y')), both(ineq('x', k, Infinity, false, false), ineq('y', h, Infinity, false, false))], (i) => both(ineq('x', h + i, Infinity, false, false), rg)),
    explain: `The graph starts at ${pointStr(h, k)} and only goes ${up ? 'up' : 'down'} and to the right, so x \u2265 ${num(h)} and y ${up ? '\u2265' : '\u2264'} ${num(k)}.`,
    check: { dom: [h, Infinity, false, false], rng: up ? [k, Infinity, false, false] : [-Infinity, k, false, false], f },
  }];
}

function recipProblems() {
  const a = pick([1, -1]);
  const h = rnd(-3, 3);
  const k = rnd(-3, 3);
  const f = { type: 'recip', a, h, k };
  const diagram = { kind: 'graph', f, view: [-6, 6, -6, 6] };
  const dom = `x ≠ ${num(h)}`;
  const rg = `y ≠ ${num(k)}`;
  const ans = both(dom, rg);
  const va = `x = ${num(h)}`;
  const ha = `y = ${num(k)}`;
  return [
    {
      kind: 'graph', diagram, prompt: 'State the domain and range of the function shown.', answer: ans,
      wrong: withWrong(ans, [both(`x ≠ ${num(k)}`, `y ≠ ${num(h)}`), both('all real numbers', rg), both(dom, 'all real numbers')], (i) => both(`x ≠ ${num(h + i)}`, rg)),
      explain: `The curve never reaches the vertical line ${va} or the horizontal line ${ha}.`,
      check: { dom: [-Infinity, Infinity, false, false, h], rng: [-Infinity, Infinity, false, false, k], f },
    },
    {
      kind: 'graph', diagram, prompt: 'What is the equation of the vertical asymptote of the function shown?', answer: va,
      wrong: withWrong(va, [ha, `x = ${num(-h)}`, `x = ${num(k)}`], (i) => `x = ${num(h + i)}`),
      explain: `The curve gets closer and closer to the vertical line ${va} without touching it.`,
    },
    {
      kind: 'graph', diagram, prompt: 'What is the equation of the horizontal asymptote of the function shown?', answer: ha,
      wrong: withWrong(ha, [va, `y = ${num(-k)}`, `y = ${num(h)}`], (i) => `y = ${num(k + i)}`),
      explain: `Far to the left and right the curve levels off toward ${ha}.`,
    },
  ];
}

function linProblems() {
  for (let tries = 0; tries < 60; tries++) {
    const m = pick([1, -1, 2, -2, 0.5, -0.5]);
    const b = rnd(-3, 3);
    const f = { type: 'lin', m, b };
    const from = rnd(-5, 2);
    const to = from + rnd(2, 6);
    if (to > 5) continue;
    const fromOpen = Math.random() < 0.35; const toOpen = Math.random() < 0.35;
    const y1 = evalF(f, from); const y2 = evalF(f, to);
    if (Math.abs(y1) > 5.5 || Math.abs(y2) > 5.5) continue;
    const r = rangeOn(f, from, to, fromOpen, toOpen);
    const dom = ineq('x', from, to, fromOpen, toOpen);
    const rg = ineq('y', r.lo, r.hi, r.loOpen, r.hiOpen);
    const answer = both(dom, rg);
    return [{
      kind: 'graph', diagram: { kind: 'graph', f, from, to, fromOpen, toOpen, view: [-6, 6, -6, 6] },
      prompt: 'State the domain and range of the function shown.', answer,
      wrong: withWrong(answer, [
        both(ineq('x', from, to, !fromOpen, toOpen), rg),
        both(dom, ineq('y', r.lo, r.hi, r.loOpen, !r.hiOpen)),
        both(rg.replace(/y/g, 'x'), dom.replace(/x/g, 'y')),
        both(dom, ineq('y', Math.min(from, to), Math.max(from, to), fromOpen, toOpen)),
      ], (i) => both(ineq('x', from, to + i, fromOpen, toOpen), rg)),
      explain: 'The domain is the set of x-values the line covers and the range is the set of y-values. A hollow dot means that end value is not included.',
      check: { dom: [from, to, fromOpen, toOpen], rng: [r.lo, r.hi, r.loOpen, r.hiOpen], f },
    }];
  }
  return [];
}

const GRAPH = { quad: quadProblems, abs: absProblems, sqrt: sqrtProblems, recip: recipProblems, lin: linProblems };

export function graphProblems(families) {
  const per = families.map((f) => shuffle(GRAPH[f]()));
  const out = [];
  for (let i = 0; per.some((p) => i < p.length); i++) for (const p of per) if (i < p.length) out.push(p[i]);
  return out;
}

/* ---------------- biology diagrams ---------------- */

export function bioProblems(id, text) {
  const def = BIO[id];
  const names = Object.keys(def.parts);
  const mentioned = names.filter((n) => def.parts[n].words.test(text || ''));
  const order = [...shuffle(mentioned), ...shuffle(names.filter((n) => !mentioned.includes(n)))];
  const out = [];
  order.forEach((target, idx) => {
    const part = def.parts[target];
    const others = shuffle(names.filter((n) => n !== target));
    const diagram = { kind: 'bio', id, target };
    out.push({
      kind: 'name', diagram, name: target, others: others.slice(0, 3),
      prompt: 'What is the name of the structure the arrow points to?', answer: cap(target),
      wrong: others.slice(0, 3).map(cap),
      explain: `${cap(target)}: ${part.blurb}`, backText: `${cap(target)}. ${part.blurb}`,
    });
    if (idx < 3) {
      const wrongBlurbs = others.slice(0, 3).map((n) => def.parts[n].blurb);
      out.push({
        kind: 'job', diagram, name: target,
        prompt: 'What is the main job of the structure the arrow points to?', answer: part.blurb, wrong: wrongBlurbs,
        explain: `The arrow points to the ${target}.`, backText: `${cap(target)}. ${part.blurb}`,
      });
    }
  });
  return out;
}

/* ---------------- turning problems into questions and cards ---------------- */

function toQuestion(p, types) {
  const options = [];
  if (types.includes('mc')) options.push('mc', 'mc', 'mc');
  if (types.includes('short')) options.push('short');
  if ((p.kind === 'name' || p.tf) && types.includes('tf')) options.push('tf');
  if ((p.kind === 'name' || p.fill) && types.includes('fill')) options.push('fill');
  if (!options.length) return null;
  const type = pick(options);
  const base = { explanation: p.explain, topic: p.topic || (p.kind === 'graph' ? 'Graphs' : 'Diagrams'), diagram: p.diagram };
  if (type === 'mc') {
    const opts = shuffle([p.answer, ...p.wrong.slice(0, 3)]);
    return { ...base, type, q: p.prompt, options: opts, answer: opts.indexOf(p.answer) };
  }
  if (type === 'short') return { ...base, type, q: p.prompt, answer: p.kind === 'name' ? p.backText : p.answer };
  if (type === 'tf') {
    if (p.tf) return { ...base, type, q: p.tf.q, answer: p.tf.answer };
    const truth = Math.random() < 0.5;
    const named = truth ? p.name : p.others[0];
    return { ...base, type, q: `The arrow points to the ${named}.`, answer: truth };
  }
  if (p.fill) return { ...base, type: 'fill', q: p.fill.q, answer: p.fill.answer };
  return { ...base, type: 'fill', q: 'The arrow points to the _____.', answer: p.name };
}

const toCard = (p) => ({ q: p.prompt, a: p.kind === 'name' ? p.backText : `${p.answer}\n${p.explain}`, topic: p.topic || (p.kind === 'graph' ? 'Graphs' : 'Diagrams'), diagram: p.diagram, weak: false });

// `extra` is a list of problem lists for pictures the AI designed (see aidiagram.js). Lists are taken in turn,
// so a quiz on several topics gets different pictures; one picture repeats only when its own parts run out.
function pool(text, extra = []) {
  const d = detect(text);
  const made = d.extra.map((id) => {
    const seen = new Set(); const list = [];
    for (let i = 0; i < 4; i++) for (const p of GENERATORS[id]?.() || []) { const k = `${p.prompt}|${p.answer}`; if (!seen.has(k)) { seen.add(k); list.push(p); } }
    return shuffle(list);
  }).filter((l) => l.length);
  const lists = [...d.bio.map((id) => bioProblems(id, text)), ...(d.graph.length ? [graphProblems(d.graph)] : []), ...made, ...extra];
  const out = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

// What share of a quiz (or card set) should be pictures, from how picture-heavy the detected topics are.
// A labelling or graphing unit gets mostly pictures, sequences or taxonomy far fewer; words like "diagram" or "sketch" in the notes nudge it up.
// `more` adds topics found elsewhere (for example Commons diagrams). A little randomness keeps two quizzes on the same notes from looking identical.
export function pictureShare(text, more = []) {
  const d = detect(text);
  const ids = [...d.bio, ...(d.graph.length ? ['graph'] : []), ...d.extra];
  const dens = [...ids.map(densityOf), ...more];
  if (!dens.length) return 0;
  const mean = dens.reduce((a, b) => a + b, 0) / dens.length;
  const hints = count(text || '', /\b(diagrams?|graphs?|sketch\w*|draw\w*|label\w*|figures?|illustrat\w*|pictures?)\b/gi);
  const share = mean + Math.min(hints, 3) * 0.03 + (Math.random() - 0.5) * 0.16;
  return Math.min(0.7, Math.max(0.1, share));
}

export function diagramQuestions({ text, types, count, extra, share = 0.3 }) {
  const all = pool(text, extra);
  if (!all.length) return [];
  const want = Math.min(Math.max(1, Math.round(count * share)), all.length);
  const qs = [];
  for (const p of all) { const q = toQuestion(p, types); if (q) qs.push(q); if (qs.length >= want) break; }
  return qs;
}

export function diagramCards({ text, extra = [] }) {
  const d = detect(text);
  const bio = d.bio.flatMap((id) => bioProblems(id, text).filter((p) => p.kind === 'name').slice(0, d.bio.length > 2 ? 3 : 6));
  const graphs = d.graph.length ? graphProblems(d.graph).slice(0, 4) : [];
  const ai = extra.flatMap((l) => l.filter((p) => p.kind === 'name').slice(0, 6));
  // a couple of cards from each detected picture type, taken in turn, so no topic crowds out the plain cards
  const lists = d.extra.map((id) => { const seen = new Set(); const list = []; for (let i = 0; i < 3 && list.length < 3; i++) for (const p of GENERATORS[id]?.() || []) { const k = `${p.prompt}|${p.answer}`; if (!seen.has(k) && list.length < 3) { seen.add(k); list.push(p); } } return list; }).filter((l) => l.length);
  const room = Math.max(0, 16 - bio.length - graphs.length - ai.length);
  const more = [];
  for (let i = 0; more.length < room && lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length && more.length < room) more.push(l[i]);
  return [...bio, ...graphs, ...ai, ...more].map(toCard);
}
