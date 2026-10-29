// Multiple choice safety net: two options that read the same (for example "-2" and "−2", or "−2 " and "−2")
// make a question impossible to answer, so duplicates are removed and a question that is left with fewer than two
// different options is dropped. Used for AI-written questions and for the ones the site draws itself.
export const visible = (s) => String(s ?? '').normalize('NFKC')
  .replace(/[−–‒‐]/g, '-')
  .replace(/[\s​ ]/g, '')
  .replace(/(^|[^0-9.])-0(?![0-9.])/g, '$10')
  .replace(/(\d)\.0+(?!\d)/g, '$1')
  .toLowerCase();

// Returns the question with look-alike options removed (the right answer is kept), or null if it cannot be saved.
export function fixMC(q) {
  if (!q || q.type !== 'mc') return q;
  const right = q.options?.[q.answer];
  if (right == null || right === '') return null;
  const seen = new Set();
  const options = [];
  for (const o of q.options) {
    const key = visible(o);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push(o);
  }
  const answer = options.findIndex((o) => visible(o) === visible(right));
  if (options.length < 2 || answer < 0) return null;
  return { ...q, options, answer };
}

export const allDistinct = (opts) => new Set(opts.map(visible)).size === opts.length && opts.every((o) => visible(o));
