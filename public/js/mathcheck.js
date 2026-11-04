// Checks the arithmetic in an AI-written question. The AI can slip on a calculation (4280 / tan 24° is 9613, not 10 800),
// so the working in the explanation ("... = 4280 / tan 24° ≈ 10 800 ft") is worked out here and compared with what it claims
// and with the option marked correct. A question whose numbers do not agree is dropped rather than shown.
// Angles are in degrees. Nothing is run with eval: the expression is parsed by hand.

const RAD = Math.PI / 180;

function tokenize(src) {
  const s = src.replace(/[−–]/g, '-').replace(/[×·*]/g, '*').replace(/[÷]/g, '/').replace(/√/g, ' sqrt ').replace(/π/g, ' pi ');
  const out = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|(sin|cos|tan|sqrt|pi)|(°)|([+\-*/^()]))/gy;
  let m; let last = 0;
  while (last < s.length && (m = re.exec(s))) {
    last = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2]) out.push({ t: m[2] === 'pi' ? 'num' : 'fn', v: m[2] === 'pi' ? Math.PI : m[2] });
    else if (m[3]) out.push({ t: 'deg' });
    else out.push({ t: 'op', v: m[4] });
  }
  if (s.slice(last).trim()) return null; // something that is not maths (a word, a unit)
  return out;
}

// expr := term (('+'|'-') term)* ; term := power (('*'|'/'|implicit) power)* ; power := unary ('^' unary)?
function parse(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const fail = () => { throw new Error('parse'); };
  function primary() {
    const t = tokens[i++];
    if (!t) fail();
    if (t.t === 'num') { if (peek()?.t === 'deg') { i++; return { v: t.v, deg: true }; } return { v: t.v }; }
    if (t.t === 'op' && t.v === '(') { const e = expr(); if (!(peek()?.t === 'op' && peek().v === ')')) fail(); i++; if (peek()?.t === 'deg') { i++; return { v: e.v, deg: true }; } return e; }
    if (t.t === 'fn') {
      const arg = peek()?.t === 'op' && peek().v === '(' ? primary() : primary();
      if (t.v === 'sqrt') return { v: Math.sqrt(arg.v) };
      const a = arg.v * RAD; // trig in degrees
      return { v: t.v === 'sin' ? Math.sin(a) : t.v === 'cos' ? Math.cos(a) : Math.tan(a) };
    }
    fail();
  }
  function unary() { if (peek()?.t === 'op' && (peek().v === '-' || peek().v === '+')) { const s = tokens[i++].v; const e = unary(); return { v: s === '-' ? -e.v : e.v }; } return primary(); }
  function power() { let b = unary(); if (peek()?.t === 'op' && peek().v === '^') { i++; const e = unary(); b = { v: b.v ** e.v }; } return b; }
  function term() {
    let a = power();
    for (;;) {
      const p = peek();
      if (p?.t === 'op' && (p.v === '*' || p.v === '/')) { i++; const b = power(); a = { v: p.v === '*' ? a.v * b.v : a.v / b.v }; }
      else if (p && (p.t === 'fn' || p.t === 'num' || (p.t === 'op' && p.v === '('))) { const b = power(); a = { v: a.v * b.v }; } // 4280 tan 66°, 2(3)
      else return a;
    }
  }
  function expr() {
    let a = term();
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) { const s = tokens[i++].v; const b = term(); a = { v: s === '+' ? a.v + b.v : a.v - b.v }; }
    return a;
  }
  const r = expr();
  if (i !== tokens.length) fail();
  return r.v;
}

export function evalExpr(src) {
  const t = tokenize(String(src));
  if (!t || !t.length) return NaN;
  try { const v = parse(t); return Number.isFinite(v) ? v : NaN; } catch { return NaN; }
}

// "10 800 ft", "9,613.04", "−2.5" -> number
export function numberIn(s) {
  const m = String(s).replace(/[−–]/g, '-').match(/-?\d[\d   ,]*(?:\.\d+)?/);
  if (!m) return NaN;
  return Number(m[0].replace(/[   ,]/g, ''));
}

const close = (a, b) => Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.012); // rounding to 3 significant figures is fine

// Looks for "<expression> = / ≈ <number>" steps in the working. Returns the last evaluable one as {computed, stated}, or null.
export function lastStep(text) {
  const t = String(text).replace(/≈|≅|⇒/g, (c) => (c === '⇒' ? ';' : '='));
  const parts = t.split(/[=;]/);
  let found = null;
  for (let k = 0; k < parts.length - 1; k++) {
    const lhs = parts[k].split(/[.,:]\s+(?=[A-Za-z])/).pop().replace(/^[^0-9(√\-−a-z]*/i, '');
    const v = evalExpr(lhs.replace(/^.*\b(?:is|are|so|then|gives)\b/i, ''));
    const hasOp = /[0-9][^0-9.]*[+\-*/×÷^°]|sin|cos|tan|sqrt|√/i.test(lhs);
    if (Number.isFinite(v) && hasOp) {
      const stated = numberIn(parts[k + 1]);
      if (Number.isFinite(stated)) found = { computed: v, stated, expr: lhs.trim() };
    }
  }
  return found;
}

// true = the numbers agree, false = they do not, null = nothing to check
export function workingAgrees(q) {
  const step = lastStep(q.explanation || '');
  if (!step) return null;
  if (!close(step.computed, step.stated)) return false;
  if (q.type === 'mc') { const opt = numberIn(q.options?.[q.answer] ?? ''); if (Number.isFinite(opt) && !close(step.computed, opt)) return false; }
  else if (q.type === 'fill' || q.type === 'short') { const a = numberIn(q.answer ?? ''); if (Number.isFinite(a) && /^[\s\-−\d., ]+[a-z% ]{0,6}$/i.test(String(q.answer)) && !close(step.computed, a)) return false; }
  return true;
}
