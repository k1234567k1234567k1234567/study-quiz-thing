// Physics diagram questions: free body diagrams, motion graphs, waves and simple circuits.
// Numbers come from the same values that draw each picture. This is a general high-school set; it is not
// matched to a particular course outline.
import { pick, shuffle, rnd, num, pointStr, withWrong, ineq } from './dutil.js';

const G = 9.8;
const f1 = (n) => String(Math.round(n * 10) / 10).replace('-', '−');
const sup2 = '²';

/* ================= free body diagrams ================= */

const FNAME = { gravity: 'the force of gravity', normal: 'the normal force', friction: 'friction', applied: 'the applied force', tension: 'tension' };
const FCAP = { gravity: 'Force of gravity', normal: 'Normal force', friction: 'Friction', applied: 'Applied force', tension: 'Tension' };
const FSYM = { gravity: 'Fg', normal: 'Fn', friction: 'Ff', applied: 'Fa', tension: 'Ft' };

function netText(netUp) { return netUp; }

export function fbdProblems() {
  const out = []; const topic = 'Free body diagrams';
  const m = pick([2, 4, 5, 10]);
  const Fg = Math.round(m * G * 10) / 10;
  const horizontal = Math.random() < 0.65;
  let forces; let net; let dirPos; let dirNeg; let axis;
  if (horizontal) {
    const a = pick([0, 0, 1, 2, 3, -1, -2]);
    const Ff = pick([4, 6, 8, 10, 12]);
    const Fa = Math.max(2, Ff + m * a);
    net = Fa - Ff; dirPos = 'right'; dirNeg = 'left'; axis = 'horizontal';
    forces = [
      { dir: 'down', mag: Fg, name: 'gravity', label: `Fg = ${f1(Fg)} N` },
      { dir: 'up', mag: Fg, name: 'normal', label: `Fn = ${f1(Fg)} N` },
      { dir: 'right', mag: Fa, name: 'applied', label: `Fa = ${f1(Fa)} N` },
      { dir: 'left', mag: Ff, name: 'friction', label: `Ff = ${f1(Ff)} N` },
    ];
  } else {
    const a = pick([0, 1, 2, -1, -2, 0.5]);
    const T = Math.round(m * (G + a) * 10) / 10;
    net = Math.round((T - Fg) * 10) / 10; dirPos = 'up'; dirNeg = 'down'; axis = 'vertical';
    forces = [
      { dir: 'down', mag: Fg, name: 'gravity', label: `Fg = ${f1(Fg)} N` },
      { dir: 'up', mag: T, name: 'tension', label: `Ft = ${f1(T)} N` },
    ];
  }
  const diagram = { kind: 'fbd', mass: m, forces };
  const aVal = Math.round((net / m) * 100) / 100;
  const dir = net > 0 ? dirPos : dirNeg;
  const mag = Math.abs(net);
  const netAns = mag < 1e-9 ? '0 N (the forces are balanced)' : `${f1(mag)} N ${dir}`;
  const sumAll = forces.filter((f) => f.dir === dirPos || f.dir === dirNeg).reduce((t, f) => t + f.mag, 0);
  const other = dir === dirPos ? dirNeg : dirPos;
  out.push({
    kind: 'graph', topic, diagram, prompt: `A ${m} kg object has the forces shown. What is the net force in the ${axis} direction?`, answer: netAns,
    wrong: withWrong(netAns, mag < 1e-9 ? [`${f1(forces[0].mag)} N ${dirNeg}`, `${f1(forces[1].mag)} N ${dirPos}`, `${f1(sumAll)} N ${dirPos}`, `${f1(2 * m)} N ${dirPos}`] : ['0 N (the forces are balanced)', `${f1(mag)} N ${other}`, `${f1(sumAll)} N ${dirPos}`, `${f1(mag + m)} N ${dir}`], (i) => `${f1(mag + 2 * i)} N ${dir}`),
    explain: `Add the forces along the ${axis} line, counting ${dirPos} as positive: net force = ${horizontal ? `${f1(forces[2].mag)} − ${f1(forces[3].mag)}` : `${f1(forces[1].mag)} − ${f1(Fg)}`} = ${f1(net)} N. ${mag < 1e-9 ? 'The forces are balanced.' : `So the net force is ${f1(mag)} N ${dir}.`}`,
    tf: { q: `The forces in the ${axis} direction are balanced (the net force is zero).`, answer: mag < 1e-9 },
  });
  const aAns = Math.abs(aVal) < 1e-9 ? '0 m/s² (constant velocity or at rest)' : `${f1(Math.abs(aVal))} m/s² ${dir}`;
  out.push({
    kind: 'graph', topic, diagram, prompt: `What is the acceleration of the ${m} kg object?`, answer: aAns,
    wrong: withWrong(aAns, Math.abs(aVal) < 1e-9 ? [`${f1(G)} m/s² down`, `1 m/s² ${dirPos}`, `${f1(sumAll / m)} m/s² ${dirPos}`, `2 m/s² ${dirNeg}`] : [`${f1(Math.abs(net))} m/s² ${dir}`, `${f1(Math.abs(aVal) + 1)} m/s² ${dir}`, '0 m/s² (constant velocity or at rest)', `${f1(Math.abs(aVal))} m/s² ${other}`, `${f1(sumAll / m)} m/s² ${dir}`], (i) => `${f1(Math.abs(aVal) + i + 1)} m/s² ${dir}`),
    explain: `Newton’s second law: a = F_net ÷ m = ${f1(net)} ÷ ${m} = ${f1(aVal)} m/s${sup2} (${dir}).`,
  });
  // which force is the "?" arrow
  const unk = pick(forces);
  const names = Object.keys(FCAP).filter((k) => forces.some((f) => f.name === k) || ['gravity', 'normal', 'friction', 'applied'].includes(k));
  const ansN = FCAP[unk.name];
  out.push({
    kind: 'graph', topic, diagram: { ...diagram, forces: forces.map((f) => ({ ...f, unknown: f === unk })) },
    prompt: 'The arrow marked "?" shows which force?', answer: ansN,
    wrong: withWrong(ansN, shuffle(names.map((k) => FCAP[k]).filter((x) => x !== ansN)), (i) => ['Air resistance', 'Buoyant force', 'Spring force'][i % 3]),
    explain: unk.name === 'gravity' ? 'Gravity always pulls straight down, toward the centre of the Earth.' : unk.name === 'normal' ? 'The normal force is the push of a surface on the object, perpendicular to the surface.' : unk.name === 'friction' ? 'Friction acts along the surface and opposes the motion (or attempted motion).' : unk.name === 'tension' ? 'Tension is the pull of a rope or string, along the rope.' : 'The applied force is the push or pull from outside that makes the object move.',
  });
  if (horizontal) {
    out.push({
      kind: 'graph', topic, diagram, prompt: 'What is the size of the normal force on the object? (It is not moving up or down.)', answer: `${f1(Fg)} N`,
      wrong: withWrong(`${f1(Fg)} N`, [`${f1(forces[2].mag)} N`, `${f1(forces[3].mag)} N`, '0 N', `${f1(Fg + forces[2].mag)} N`, `${f1(m)} N`], (i) => `${f1(Fg + i * 5)} N`),
      explain: 'There is no vertical acceleration, so the vertical forces balance: the upward normal force equals the downward weight, Fn = Fg.',
    });
  } else {
    const T = forces[1].mag;
    out.push({
      kind: 'graph', topic, diagram, prompt: 'Is the object speeding up, slowing down, or moving at a constant velocity in the upward direction?', answer: net > 1e-9 ? 'The net force is upward: it accelerates upward' : net < -1e-9 ? 'The net force is downward: it accelerates downward' : 'The forces are balanced: no acceleration',
      wrong: withWrong(net > 1e-9 ? 'The net force is upward: it accelerates upward' : net < -1e-9 ? 'The net force is downward: it accelerates downward' : 'The forces are balanced: no acceleration', ['The net force is upward: it accelerates upward', 'The net force is downward: it accelerates downward', 'The forces are balanced: no acceleration', 'It must be at rest because tension is present'], () => 'It falls freely'),
      explain: `Compare tension (${f1(T)} N up) with weight (${f1(Fg)} N down). ${net > 0 ? 'Tension is larger, so the net force points up.' : net < 0 ? 'Weight is larger, so the net force points down.' : 'They are equal, so the forces balance.'}`,
    });
  }
  void netText; void FNAME; void FSYM; void pointStr; void ineq;
  return out;
}

/* ================= motion graphs ================= */

const PHYS_VIEW = (xs, ys, pad = 1) => [0, Math.max(...xs) + 1, Math.floor(Math.min(...ys, 0)) - pad, Math.ceil(Math.max(...ys, 0)) + pad];

export function motionProblems() {
  const out = []; const topic = 'Motion graphs';
  // velocity-time graph with constant acceleration
  for (let tries = 0; tries < 60; tries++) {
    const a = pick([1, 2, 3, -1, -2, -3]); const T = pick([4, 6, 8]); const v0 = rnd(-6, 8);
    const v1 = v0 + a * T;
    if (Math.abs(v1) > 12) continue;
    const f = { type: 'pw', pts: [[0, v0], [T, v1]] };
    const diagram = { kind: 'graph', f, view: PHYS_VIEW([T], [v0, v1]), xlabel: 't (s)', ylabel: 'v (m/s)', marks: [{ x: 0, y: v0, color: 'primary' }, { x: T, y: v1, color: 'primary' }], size: [360, 300], label: 'Velocity-time graph' };
    const acc = `${num(a)} m/s${sup2}`;
    out.push({
      kind: 'graph', topic, diagram, prompt: 'The velocity-time graph of an object is shown. What is its acceleration?', answer: acc,
      wrong: withWrong(acc, [`${num(-a)} m/s${sup2}`, `${num(v1)} m/s${sup2}`, `${num(v1 - v0)} m/s${sup2}`, `${num(a * 2)} m/s${sup2}`, `${num(v0)} m/s${sup2}`], (i) => `${num(a + i + 1)} m/s${sup2}`),
      explain: `Acceleration is the slope of a velocity-time graph: (${num(v1)} − ${num(v0)}) ÷ ${T} = ${num(a)} m/s${sup2}.`,
      fill: { q: `The acceleration is _____ m/s²`, answer: num(a) },
    });
    if (v0 * v1 > 0) {
      const disp = ((v0 + v1) / 2) * T;
      const ds = `${num(disp)} m`;
      out.push({
        kind: 'graph', topic, diagram, prompt: `What is the object's displacement from t = 0 to t = ${T} s?`, answer: ds,
        wrong: withWrong(ds, [`${num(v1 * T)} m`, `${num(v0 * T)} m`, `${num((v0 + v1) * T)} m`, `${num(disp / 2)} m`], (i) => `${num(disp + 2 * i)} m`),
        explain: `Displacement is the area under a velocity-time graph. The area is a trapezoid: ((${num(v0)} + ${num(v1)}) ÷ 2) × ${T} = ${num(disp)} m.`,
      });
    } else if (v0 !== 0 && v1 !== 0 && (-v0) % a === 0) {
      const t0 = -v0 / a;
      out.push({
        kind: 'graph', topic, diagram, prompt: 'At what time does the object change direction (its velocity is zero for an instant)?', answer: `${num(t0)} s`,
        wrong: withWrong(`${num(t0)} s`, [`${num(T)} s`, `${num(t0 + 1)} s`, `${num(T - t0)} s`, `${num(t0 + 2)} s`], (i) => `${num(t0 + i + 2)} s`),
        explain: 'The object changes direction where the line crosses the time axis, because the velocity changes sign there.',
      });
    }
    const tq = rnd(1, T - 1); const vq = v0 + a * tq;
    out.push({
      kind: 'graph', topic, diagram, prompt: `What is the velocity at t = ${tq} s?`, answer: `${num(vq)} m/s`,
      wrong: withWrong(`${num(vq)} m/s`, [`${num(-vq)} m/s`, `${num(vq + a)} m/s`, `${num(v0)} m/s`, `${num(a * tq)} m/s`], (i) => `${num(vq + i + 1)} m/s`),
      explain: `Read the height of the line at t = ${tq} s, or use v = v₀ + at = ${num(v0)} + (${num(a)})(${tq}) = ${num(vq)} m/s.`,
    });
    break;
  }
  // position-time graph: moving, resting, then moving back
  for (let tries = 0; tries < 60; tries++) {
    const t1 = rnd(2, 4); const rest = rnd(2, 3); const t3 = rnd(2, 4);
    const v1 = pick([1, 2, 3, 4]); const d0 = rnd(0, 4);
    const d1 = d0 + v1 * t1;
    const v3 = pick([-1, -2, -3, 2]);
    const d3 = d1 + v3 * t3;
    if (d3 < -2 || d3 > 18 || d1 > 18) continue;
    const T = t1 + rest + t3;
    const pts = [[0, d0], [t1, d1], [t1 + rest, d1], [T, d3]];
    const f = { type: 'pw', pts };
    const diagram = { kind: 'graph', f, view: [0, T + 1, Math.min(0, Math.floor(d3)) - 1, Math.ceil(Math.max(d1, d0)) + 1], xlabel: 't (s)', ylabel: 'd (m)', marks: pts.map(([x, y]) => ({ x, y, color: 'primary' })), size: [360, 300], label: 'Position-time graph' };
    const v = `${num(v1)} m/s`;
    out.push({
      kind: 'graph', topic, diagram, prompt: `The position-time graph is shown. What is the velocity during the first ${t1} s?`, answer: v,
      wrong: withWrong(v, [`${num(d1)} m/s`, `${num(d1 - d0)} m/s`, `${num(-v1)} m/s`, `0 m/s`, `${num(v1 + 1)} m/s`], (i) => `${num(v1 + i + 1)} m/s`),
      explain: `Velocity is the slope of a position-time graph: (${num(d1)} − ${num(d0)}) ÷ ${t1} = ${num(v1)} m/s.`,
    });
    const restAns = `from ${t1} s to ${t1 + rest} s`;
    out.push({
      kind: 'graph', topic, diagram, prompt: 'During which time interval is the object at rest?', answer: restAns,
      wrong: withWrong(restAns, [`from 0 s to ${t1} s`, `from ${t1 + rest} s to ${T} s`, `from 0 s to ${T} s`, `from ${t1 + 1} s to ${T} s`], (i) => `from ${i} s to ${i + 2} s`),
      explain: 'A flat (horizontal) line on a position-time graph means the position is not changing, so the velocity is zero.',
    });
    const avg = (d3 - d0) / T;
    const avgS = `${f1(avg)} m/s`;
    out.push({
      kind: 'graph', topic, diagram, prompt: `What is the average velocity from t = 0 to t = ${T} s?`, answer: avgS,
      wrong: withWrong(avgS, [`${f1(-avg)} m/s`, `${f1((Math.abs(d1 - d0) + Math.abs(d3 - d1)) / T)} m/s`, `${f1(d3 / T)} m/s`, `${f1(avg + 1)} m/s`, `${f1(v1)} m/s`], (i) => `${f1(avg + i * 0.5 + 0.7)} m/s`),
      explain: `Average velocity = total displacement ÷ total time = (${num(d3)} − ${num(d0)}) ÷ ${T} = ${f1(avg)} m/s.`,
    });
    break;
  }
  return out;
}

/* ================= waves ================= */

export function waveProblems() {
  const out = []; const topic = 'Waves';
  const lam = pick([2, 4, 6]); const A = pick([1, 2, 3]); const freq = pick([2, 5, 10]);
  const f = { type: 'sin', a: A, k: 360 / lam, d: 0, c: 0 };
  const diagram = { kind: 'graph', f, view: [0, Math.round(lam * 2.5), -4, 4], xlabel: 'x (m)', ylabel: 'y (cm)', xstep: lam / 2, ystep: 1, size: [420, 280], label: 'A transverse wave: displacement against position' };
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the amplitude of the wave shown?', answer: `${A} cm`,
    wrong: withWrong(`${A} cm`, [`${2 * A} cm`, `${A + 1} cm`, `${lam} cm`, `${A + 2} cm`], (i) => `${A + i + 1} cm`),
    explain: 'Amplitude is the maximum displacement from the rest (middle) line, to a crest or a trough.',
  });
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the wavelength of the wave shown? (The distance between two neighbouring crests.)', answer: `${lam} m`,
    wrong: withWrong(`${lam} m`, [`${f1(lam / 2)} m`, `${lam * 2} m`, `${A} m`, `${lam + 1} m`], (i) => `${lam + i * 2} m`),
    explain: `One full wave (crest to crest) covers ${lam} m along the x-axis.`,
  });
  const speed = freq * lam;
  out.push({
    kind: 'graph', topic, diagram, prompt: `The wave shown has a frequency of ${freq} Hz. What is its speed?`, answer: `${speed} m/s`,
    wrong: withWrong(`${speed} m/s`, [`${f1(freq / lam)} m/s`, `${freq + lam} m/s`, `${speed * 2} m/s`, `${f1(lam / freq)} m/s`], (i) => `${speed + i * 2} m/s`),
    explain: `v = fλ = ${freq} × ${lam} = ${speed} m/s.`,
    fill: { q: `The speed is _____ m/s`, answer: String(speed) },
  });
  return out;
}

/* ================= circuits ================= */

const PAIRS = [[6, 3, 2], [12, 4, 3], [10, 10, 5], [20, 5, 4], [6, 6, 3], [30, 15, 10], [12, 12, 6]];

export function circuitProblems() {
  const out = []; const topic = 'Circuits';
  const series = Math.random() < 0.5;
  const R = series ? pick([[2, 4], [3, 6], [5, 5], [4, 8], [2, 3, 5], [1, 2, 3], [10, 20]]) : pick(PAIRS).slice(0, 2);
  const Rt = series ? R.reduce((t, x) => t + x, 0) : (R[0] * R[1]) / (R[0] + R[1]);
  const I = pick([1, 2, 3, 0.5]); const V = Rt * I;
  if (V > 60 || !Number.isInteger(V)) return [];
  const diagram = { kind: 'circuit', mode: series ? 'series' : 'parallel', V, R };
  const rtAns = `${f1(Rt)} Ω`;
  out.push({
    kind: 'graph', topic, diagram, prompt: `What is the total resistance of the ${series ? 'series' : 'parallel'} circuit?`, answer: rtAns,
    wrong: withWrong(rtAns, series ? [`${f1((R[0] * R[1]) / (R[0] + R[1]))} Ω`, `${f1(R[0] * R[1])} Ω`, `${f1(Rt + 2)} Ω`, `${f1(Rt / 2)} Ω`] : [`${f1(R[0] + R[1])} Ω`, `${f1(R[0] * R[1])} Ω`, `${f1(Rt * 2)} Ω`, `${f1(Rt + 1)} Ω`], (i) => `${f1(Rt + i + 2)} Ω`),
    explain: series ? `In series the resistances add: ${R.join(' + ')} = ${f1(Rt)} Ω.` : `In parallel: 1/R = 1/${R[0]} + 1/${R[1]}, so R = ${f1(Rt)} Ω.`,
  });
  const iAns = `${f1(I)} A`;
  out.push({
    kind: 'graph', topic, diagram, prompt: 'What is the total current supplied by the battery?', answer: iAns,
    wrong: withWrong(iAns, [`${f1(V)} A`, `${f1(V * Rt)} A`, `${f1(I * 2)} A`, `${f1(I + 1)} A`, `${f1(V / R[0])} A`].filter((x) => x !== iAns), (i) => `${f1(I + i + 1)} A`),
    explain: `Ohm’s law: I = V ÷ R = ${V} ÷ ${f1(Rt)} = ${f1(I)} A.`,
  });
  if (series) {
    const k = rnd(0, R.length - 1);
    const vk = I * R[k];
    out.push({
      kind: 'graph', topic, diagram: { ...diagram, unknown: undefined }, prompt: `In this series circuit, what is the voltage across the ${R[k]} Ω resistor?`, answer: `${f1(vk)} V`,
      wrong: withWrong(`${f1(vk)} V`, [`${f1(V)} V`, `${f1(V / R.length)} V`, `${f1(R[k])} V`, `${f1(vk + 2)} V`, `${f1(I)} V`], (i) => `${f1(vk + i + 1)} V`),
      explain: `The current is the same everywhere in a series circuit: I = ${f1(I)} A. V = IR = ${f1(I)} × ${R[k]} = ${f1(vk)} V.`,
    });
  } else {
    out.push({
      kind: 'graph', topic, diagram, prompt: `What is the voltage across the ${R[0]} Ω resistor?`, answer: `${V} V`,
      wrong: withWrong(`${V} V`, [`${f1(V / 2)} V`, `${f1(V * 2)} V`, `${f1(I * R[0])} V`, `${f1(V + 2)} V`], (i) => `${V + i + 1} V`),
      explain: 'Every branch of a parallel circuit has the same voltage as the battery.',
      tf: { q: 'Each resistor in this parallel circuit has the same voltage across it.', answer: true },
    });
  }
  return out;
}

export const PHYSICS = { fbd: fbdProblems, motion: motionProblems, wave: waveProblems, circuit: circuitProblems };
