// Marks a typed fill-in answer. Words forgive a small typo; numbers and exact values are compared by value, never by spelling:
// "√3/3" equals "1/√3", "−2/√3" is not "2/√3", and "2/√2" is not forgiven as a typo of "2/√3".
import { evalExpr } from './mathcheck.js';

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const UNIT = /\s*(?:°|degrees?|deg|cm²?|mm|km|m²?|ft|units?|sq\.? ?units?|n|v|a|j|w|hz|s|m\/s²?|kg|g|%)\s*$/i;
// A number or an exact expression (7, −2.5, 3/4, √3/2, 2/√3, 5√3, 10 800 ft, 30°) as a number; NaN for anything else.
export function exactValue(s) {
  let t = String(s).trim().replace(/[−–]/g, '-').replace(/·/g, '*').replace(/\broot\b/gi, 'sqrt').replace(/\bpi\b/gi, 'π');
  t = t.replace(/(\d)[\s  ]+(?=\d{3}(?!\d))/g, '$1').replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
  const bare = t.replace(UNIT, '');
  const v = evalExpr(bare || t);
  return Number.isFinite(v) ? v : NaN;
}

const key = (s) => String(s).toLowerCase().replace(/[−–]/g, '-').replace(/>=/g, '≥').replace(/<=/g, '≤').replace(/!=/g, '≠').replace(/\s+/g, '');

export function fillCorrect(input, answer) {
  const y = exactValue(answer);
  if (Number.isFinite(y)) {
    const x = exactValue(input);
    if (!Number.isFinite(x)) return false;
    const rounded = /\d\.\d/.test(String(answer)); // an answer like 10.2 was rounded, so the same rounding is fine; an exact one must match exactly
    return Math.abs(x - y) <= (rounded ? Math.max(0.0051, Math.abs(y) * 0.004) : 1e-9 * Math.max(1, Math.abs(y)));
  }
  const a = norm(input); const b = norm(answer);
  if (!a) return false;
  // an answer with digits or symbols (a point, an inequality, a genotype) must match as typed, ignoring spaces, case and minus-sign style
  if (/[^a-z\s.,;:'"!?()\-]/i.test(String(answer))) return key(input) === key(answer);
  return a === b || lev(a, b) <= (b.length > 8 ? 2 : b.length > 4 ? 1 : 0);
}
