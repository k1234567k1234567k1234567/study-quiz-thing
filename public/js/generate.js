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

// A "term" has to be something a student could be asked about: not a heading ("MCR 3U1 Unit 4"), not a bit of working ("The point (−2, 3)")
// and not the start of an ordinary sentence ("On the test there ...").
const badTerm = (t) => /\d|[()=<>]/.test(t) || /\b(unit|lesson|chapter|part)s?\b/i.test(t) || /^(on|in|at|for|if|when|while|since|because|there|here|during|after|before|by|with|as|each|every|all|so|then|but|and|or)\b/i.test(t.trim()) || /^(?:it|this|that|there|they|he|she|we)$/i.test(t.trim());

function split(line) {
  let m = line.match(/^(.{2,60}?)\s+(is defined as|are defined as|is|are|means|refers to|is called|are called)\s+(.+)$/i);
  // keep the verb the notes used ("X means Y" must not become the ungrammatical "X is Y")
  if (m && words(m[1]).length <= 6 && !badTerm(m[1])) return { term: m[1].trim(), def: m[3].trim(), verb: m[2].toLowerCase(), plural: /^are\b/i.test(m[2]) };
  m = line.match(/^(.{2,50}?)\s*(?::|\s[-–—]\s)\s*(.+)$/);
  if (m && words(m[1]).length <= 5 && !badTerm(m[1])) return { term: m[1].trim(), def: m[2].trim(), verb: ':', plural: false };
  return null;
}

// What a fill-in-the-blank may hide. Working (numbers, =, °, √), measurements ("1 km", "30%") and tasks ("Include a labelled diagram") are skipped,
// because blanking them leaves nothing to work from ("A ship is _____ km out to sea").
const TASK = /^(include|draw|sketch|determine|find|solve|calculate|use|state|describe|always|remember|write|give|explain|show|label|round|make|identify|evaluate|compare|complete|list|name|graph|copy|check|for each|how many|what|why|which|let|given)\b/i;
const MATHY = /[=<>×÷+√°²³±∠≤≥]|\d\s*[/^]\s*\d|\b[a-z]\s*\(/;
const UNITS = /^(?:km|m|cm|mm|ft|kg|g|mg|s|min|h|hr|hours?|days?|years?|degrees?|units?|ml|l|n|j|w|v|a|hz)$/i;
function clozeWord(line) {
  if (TASK.test(line.trim()) || /\?\s*$/.test(line)) return null;
  const ws = words(line).map((w, i) => ({ raw: w, w: w.replace(/^[^\w]+|[^\w]+$/g, ''), i })).filter((x) => x.w);
  const mathy = MATHY.test(line) || (line.match(/\d+(?:\.\d+)?/g) || []).length >= 2;
  const ok = (x, k) => {
    const lw = x.w.toLowerCase();
    if (STOP.has(lw) || UNITS.test(lw)) return false;
    if (/^[A-Za-z][A-Za-z'-]{3,}$/.test(x.w)) return true; // a real word of four or more letters
    if (/^\d+$/.test(x.w) && !mathy) { // a number only when it is a plain fact: a year, or a count with nothing else to compute
      const next = (ws[k + 1]?.w || '').toLowerCase(); const unit = UNITS.test(next) || /%/.test(x.raw);
      return !unit && (/^(1[0-9]|20)\d\d$/.test(x.w) || ws.length >= 6);
    }
    return false;
  };
  const cands = ws.filter(ok);
  if (!cands.length) return null;
  const score = (x) => (/\d/.test(x.w) ? 3 : 0) + (x.i > 0 && /^[A-Z]/.test(x.w) ? 5 : 0) + Math.min(x.w.length, 12) * 0.5;
  return cands.reduce((b, x) => (score(x) > score(b) ? x : b));
}

function cloze(line) {
  const k = clozeWord(line);
  if (!k) return null;
  if (words(line).length < 6) return null; // too little left to go on
  if (!/[.!?)]$/.test(line.trim()) && words(line).length <= 9) return null; // a heading or title, not a statement
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
      cards.push({ id: uid(), q: `${s.plural ? 'What are' : 'What is'} ${lowerArticle(s.term)}?`, a: cap(sentence(s.def)), topic: f.heading });
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

// Question types lean towards recall (easy) or towards typing an answer (hard).
const LEVEL_MIX = { easy: { mc: 1.5, tf: 1.5, fill: 0.7, short: 0.3 }, medium: { mc: 1, tf: 1, fill: 1, short: 1 }, hard: { mc: 0.8, tf: 0.4, fill: 1.5, short: 2 } };

const toks = (s) => new Set(String(s).toLowerCase().match(/[a-z0-9]+/g) || []);
// 0 = nothing in common, 1 = the same: shared words, and similar length.
const alike = (a, b) => {
  const x = toks(a); const y = toks(b);
  const both = [...x].filter((w) => y.has(w)).length;
  const jac = both / ((x.size + y.size - both) || 1);
  return jac + (1 - Math.abs(a.length - b.length) / (Math.max(a.length, b.length) || 1));
};
// Wrong options: far from the answer when easy, close to it when hard, random when medium.
export function pickWrong(correct, candidates, level, n = 3) {
  const list = [...new Set(candidates)].filter((c) => c && c.toLowerCase() !== String(correct).toLowerCase());
  if (level === 'medium') return shuffle(list).slice(0, n);
  const scored = shuffle(list).map((c) => ({ c, s: alike(correct, c) }));
  scored.sort((a, b) => (level === 'hard' ? b.s - a.s : a.s - b.s));
  return scored.slice(0, n).map((x) => x.c);
}

export function makeQuiz(text, { count, types, grade, difficulty = 'medium' }) {
  const { facts } = parse(text);
  const items = facts.map((f) => ({ ...f, s: split(f.line) }));
  const defs = items.filter((x) => x.s);
  const pool = [];
  const mixL = LEVEL_MIX[difficulty] || LEVEL_MIX.medium;
  const weights = Object.entries(MIX[grade]).filter(([t]) => types.includes(t)).map(([t, w]) => [t, w * mixL[t]]);
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
    const q = build(type, f, defs, items, difficulty);
    if (q) pool.push(q);
  });
  return pool;
}

const sameText = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function build(type, f, defs, items, level = 'medium') {
  const topic = f.heading;
  // A term the notes explain more than once ("The principal angle is ..." as a definition and again in an example) has several true
  // statements, so a question built from one of them could call another true statement false. Those go to fill-in-the-blank instead.
  const termOnce = f.s && !defs.some((d) => d !== f && sameText(d.s.term) === sameText(f.s.term));
  const others = termOnce ? defs.filter((d) => d !== f && sameText(d.s.term) !== sameText(f.s.term)) : [];
  if (type === 'mc' && termOnce && defs.length >= 4) {
    const wrong = pickWrong(cap(f.s.def), others.map((d) => cap(d.s.def)), level);
    if (wrong.length === 3) {
      const options = shuffle([cap(f.s.def), ...wrong]);
      return { type: 'mc', q: `Which statement correctly describes ${f.s.term}?`, options, answer: options.indexOf(cap(f.s.def)), explanation: sentence(f.line), topic };
    }
  }
  if (type === 'tf' && termOnce && others.length >= 1) {
    const stmt = (def) => (f.s.verb === ':' ? `${cap(f.s.term)}: ${def}` : `${cap(f.s.term)} ${f.s.verb} ${def}`);
    // a false statement must not appear anywhere in the notes, or it would be marked false while the notes say it is true
    const known = items.map((x) => sameText(x.line));
    const wrongOne = shuffle(others).find((d) => { const t = sameText(stmt(d.s.def)); return !known.some((k) => k.includes(t) || t.includes(k)); });
    const truth = !wrongOne || Math.random() < 0.5;
    return { type: 'tf', q: stmt(truth ? f.s.def : wrongOne.s.def), answer: truth, explanation: sentence(f.line), topic };
  }
  if (type === 'short' && termOnce) {
    return { type: 'short', q: `Explain: ${f.s.term}`, answer: cap(sentence(f.s.def)), explanation: '', topic };
  }
  if (type === 'mc' || type === 'fill' || type === 'tf' || type === 'short') {
    const c = cloze(f.line);
    if (!c) return null;
    if (type === 'mc' && items.length >= 4) {
      const wrong = pickWrong(c.answer, items.map((x) => clozeWord(x.line)?.w), level);
      if (wrong.length === 3) {
        const options = shuffle([c.answer, ...wrong]);
        return { type: 'mc', q: `Choose the word that fills the blank: ${c.text}`, options, answer: options.indexOf(c.answer), explanation: sentence(f.line), topic };
      }
    }
    return { type: 'fill', q: c.text, answer: c.answer, explanation: sentence(f.line), topic };
  }
  return null;
}
