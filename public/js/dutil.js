// Small helpers shared by the diagram question makers.
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
export const clean = (n) => Math.round(n * 100) / 100;
export const num = (n) => String(clean(n)).replace('-', '−');
export const pointStr = (x, y) => `(${num(x)}, ${num(y)})`;
export const unique = (list, correct) => [...new Set(list)].filter((x) => x !== correct);

// Three wrong options that differ from the right one; `filler(i)` makes more if the list is short.
export function withWrong(correct, wrong, filler) {
  const w = unique(wrong, correct);
  let i = 1;
  while (w.length < 3 && i < 50) { const x = filler(i++); if (x !== correct && !w.includes(x)) w.push(x); }
  return w.slice(0, 3);
}

// "3x + 2" style text for a linear piece, with proper minus signs.
export function signed(n, first = false) {
  const s = num(Math.abs(n));
  if (first) return n < 0 ? `−${s}` : s;
  return n < 0 ? ` − ${s}` : ` + ${s}`;
}

// "x ≥ 3" style inequality text; infinite ends are dropped.
export function ineq(v, lo, hi, loOpen = false, hiOpen = false) {
  if (lo === -Infinity && hi === Infinity) return 'all real numbers';
  if (lo === -Infinity) return `${v} ${hiOpen ? '<' : '≤'} ${num(hi)}`;
  if (hi === Infinity) return `${v} ${loOpen ? '>' : '≥'} ${num(lo)}`;
  return `${num(lo)} ${loOpen ? '<' : '≤'} ${v} ${hiOpen ? '<' : '≤'} ${num(hi)}`;
}

export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
// a reduced fraction like "-3/5" with a proper minus sign
export function frac(n, d) {
  const g = gcd(n, d) || 1;
  let p = n / g; let q = d / g;
  if (q < 0) { p = -p; q = -q; }
  return q === 1 ? num(p) : `${p < 0 ? '−' : ''}${Math.abs(p)}/${q}`;
}
export const half = (n) => (n === 0.5 ? '½' : n === -0.5 ? '−½' : num(n));
export const round1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
