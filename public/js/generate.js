// Basic mode: rule-based cards and quizzes (no AI). Simpler questions, but every line is covered.
import { uid } from './store.js';

const STOP = new Set('the a an and or but of to in on at for with by from as is are was were be been it its this that these those which who whom whose when where while than then also not no can could may might will would should have has had do does did into over under between about their there they them he she we you your our'.split(' '));

const clean = (s) => s.replace(/^\s*(?:[-*•·▪◦]|\d+[.)]|[a-z][.)])\s+/i, '').replace(/\s+/g, ' ').trim();
const words = (s) => s.split(/\s+/).filter(Boolean);
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const isBullet = (l) => /^\s*(?:[-*•·▪◦]|\d+[.)]|[a-z][.)])\s+/i.test(l);
const isNumbered = (l) => /^\s*\d+[.)]\s+/.test(l);

function isHeading(line, next) {
  const t = line.trim();
  if (!t || isBullet(t) || words(t).length > 8) return false;
  if (/[.!?]$/.test(t) && !t.endsWith(':')) return false;
  return t.endsWith(':') || t === t.toUpperCase() || (next !== undefined && (isBullet(next) || words(next).length > words(t).length));
}

// Photos come back hard-wrapped, so one sentence can span several lines. Join those lines
// back together, otherwise every fragment becomes its own (cut-off) question.
function unwrap(raw) {
  const out = [];
  for (const line of raw) {
    const prev = out[out.length - 1];
    const lastWord = prev ? (prev.match(/([A-Za-z]+)[,;]?$/) || [])[1] : '';
    const continues = prev && !isBullet(line) && !/[.!?:]$/.test(prev)
      && (/^[a-z]/.test(line) || /[,;]$/.test(prev) || STOP.has((lastWord || '').toLowerCase()));
    if (!continues) out.push(line);
    else if (/[A-Za-z]-$/.test(prev) && /^[a-z]/.test(line)) out[out.length - 1] = prev.slice(0, -1) + line;
    else out[out.length - 1] = `${prev} ${line}`;
  }
  return out;
}

function parse(text) {
  const lines = unwrap(text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^-{3,}$/.test(l) && !/^\[.*\]$/.test(l)));
  const facts = [];
  const lists = [];
  let heading = '';
  let run = null;
  lines.forEach((raw, i) => {
    if (isHeading(raw, lines[i + 1])) {
      heading = raw.replace(/:$/, '');
      run = null;
      return;
    }
    // A long paragraph becomes one fact per sentence.
    const parts = isBullet(raw) ? [raw] : raw.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    parts.forEach((p) => {
      const line = clean(p);
      if (words(line).length < 2) return;
      facts.push({ line, heading });
    });
    if (isBullet(raw)) {
      const numbered = isNumbered(raw);
      if (!run || run.numbered !== numbered) { run = { heading, numbered, items: [] }; lists.push(run); }
      run.items.push(clean(raw));
    } else run = null;
  });
  return { facts, lists };
}

function split(line) {
  let m = line.match(/^(.{2,60}?)\s+(?:is defined as|are defined as|is|are|means|refers to|is called|are called)\s+(.+)$/i);
  if (m && words(m[1]).length <= 6 && !/^(?:it|this|that|there|they|he|she|we)$/i.test(m[1].trim())) return { term: m[1].trim(), def: m[2].trim(), verb: /\bare\b/i.test(line.slice(m[1].length, m[1].length + 12)) ? 'are' : 'is' };
  m = line.match(/^(.{2,50}?)\s*(?::|\s[-–—]\s)\s*(.+)$/);
  if (m && words(m[1]).length <= 5) return { term: m[1].trim(), def: m[2].trim(), verb: ':' };
  return null;
}

function keyWord(line) {
  const ws = words(line).map((w, i) => ({ raw: w, w: w.replace(/^[^\w]+|[^\w]+$/g, ''), i })).filter((x) => x.w);
  const score = (x) => (/\d/.test(x.w) ? 6 : 0) + (x.i > 0 && /^[A-Z]/.test(x.w) ? 5 : 0) + (STOP.has(x.w.toLowerCase()) ? -9 : 0) + Math.min(x.w.length, 12) * 0.5;
  return ws.length ? ws.reduce((b, x) => (score(x) > score(b) ? x : b)) : null;
}

function cloze(line) {
  const k = keyWord(line);
  if (!k) return null;
  const re = new RegExp(`\\b${k.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return { text: line.replace(re, '_____'), answer: k.w };
}

const lowerArticle = (t) => t.replace(/^(The|A|An)\s/, (m) => m.toLowerCase());
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sentence = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

export function makeCards(text) {
  const { facts, lists } = parse(text);
  const cards = [];
  for (const f of facts) {
    const s = split(f.line);
    if (s && words(s.def).length >= 1) {
      cards.push({ id: uid(), q: `${s.verb === 'are' ? 'What are' : 'What is'} ${lowerArticle(s.term)}?`, a: cap(sentence(s.def)), topic: f.heading });
    } else {
      const c = cloze(f.line);
      cards.push({ id: uid(), q: c ? `Fill in the blank: ${c.text}` : `Explain: ${f.line}`, a: c ? `${c.answer}. (${sentence(f.line)})` : f.line, topic: f.heading });
    }
  }
  for (const l of lists) {
    if (l.items.length >= 2) {
      const where = l.heading ? ` of "${l.heading}"` : '';
      cards.push({ id: uid(), q: l.numbered ? `List the steps${where}, in order.` : `List the points${where}.`, a: l.items.map((x, i) => (l.numbered ? `${i + 1}. ${x}` : `• ${x}`)).join('\n'), topic: l.heading });
    }
  }
  return cards;
}

const MIX = {
  applied: { mc: 5, tf: 2, fill: 3, short: 0 },
  academic: { mc: 4, tf: 3, fill: 2, short: 1 },
  college: { mc: 3, tf: 2, fill: 3, short: 2 },
  university: { mc: 2, tf: 2, fill: 2, short: 4 },
};

export function makeQuiz(text, { count, types, grade }) {
  const { facts } = parse(text);
  const items = facts.map((f) => ({ ...f, s: split(f.line) }));
  const defs = items.filter((x) => x.s);
  const pool = [];
  const weights = Object.entries(MIX[grade]).filter(([t]) => types.includes(t));
  const total = weights.reduce((n, [, w]) => n + w, 0) || 1;
  const plan = [];
  for (let i = 0; i < Math.min(count, items.length); i++) {
    let r = Math.random() * total;
    plan.push((weights.find(([, w]) => (r -= w) < 0) || weights[0] || ['fill'])[0]);
  }
  const ordered = shuffle(items);
  plan.forEach((type, i) => {
    const f = ordered[i % Math.max(ordered.length, 1)];
    if (!f) return;
    const q = build(type, f, defs, items);
    if (q) pool.push(q);
  });
  return pool;
}

function build(type, f, defs, items) {
  const topic = f.heading;
  if (type === 'mc' && f.s && defs.length >= 4) {
    const wrong = shuffle(defs.filter((d) => d !== f)).slice(0, 3).map((d) => cap(d.s.def));
    const options = shuffle([cap(f.s.def), ...wrong]);
    return { type: 'mc', q: `Which statement correctly describes ${f.s.term}?`, options, answer: options.indexOf(cap(f.s.def)), explanation: sentence(f.line), topic };
  }
  if (type === 'tf' && f.s && defs.length >= 2) {
    const truth = Math.random() < 0.5;
    const other = shuffle(defs.filter((d) => d !== f))[0];
    const def = truth ? f.s.def : other.s.def;
    return { type: 'tf', q: f.s.verb === ':' ? `${cap(f.s.term)}: ${def}` : `${cap(f.s.term)} ${f.s.verb} ${def}`, answer: truth, explanation: sentence(f.line), topic };
  }
  if (type === 'short' && f.s) {
    return { type: 'short', q: `Explain: ${f.s.term}`, answer: cap(sentence(f.s.def)), explanation: '', topic };
  }
  if (type === 'mc' || type === 'fill' || type === 'tf' || type === 'short') {
    const c = cloze(f.line);
    if (!c) return null;
    if (type === 'mc' && items.length >= 4) {
      const wrong = shuffle(items.map((x) => keyWord(x.line)?.w).filter((w) => w && w.toLowerCase() !== c.answer.toLowerCase())).filter((w, i, a) => a.indexOf(w) === i).slice(0, 3);
      if (wrong.length === 3) {
        const options = shuffle([c.answer, ...wrong]);
        return { type: 'mc', q: `Choose the word that fills the blank: ${c.text}`, options, answer: options.indexOf(c.answer), explanation: sentence(f.line), topic };
      }
    }
    return { type: 'fill', q: c.text, answer: c.answer, explanation: sentence(f.line), topic };
  }
  return null;
}
