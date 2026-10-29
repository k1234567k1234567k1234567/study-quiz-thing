// Ties photos / notes / topics to cards and quizzes, in AI mode or basic mode.
import * as ai from './ai.js';
import * as basic from './generate.js';
import { ocrImages } from './ocr.js';
import { wikipediaText } from './topics.js';
import { diagramQuestions, diagramCards, pictureShare } from './diagramq.js';
import { fixMC } from './options.js';
import { LEVEL_ORDER, levelsOf, splitCount } from './prompts.js';
import { findFigures, figureCards, figureQuestions, figureGroups } from './figures.js';

const chunkText = (text, size) => {
  const chunks = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if (cur.length + line.length > size && cur) { chunks.push(cur); cur = ''; }
    cur += `${line}\n`;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
};

// Step 1: photos -> text (the user reviews/edits this before generating).
export async function readNotes({ images, notes, mode, onProgress }) {
  let text = (notes || '').trim();
  if (images.length) {
    const read = mode === 'ai' && ai.canReadPhotos() ? await ai.transcribe(images, onProgress) : await ocrImages(images, onProgress);
    text = [text, read].filter(Boolean).join('\n---\n');
  }
  return text;
}

const tokens = (s) => new Set((s.toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter((w) => w.length > 3));

// Lines of the notes that no card seems to mention get their own extra cards.
function uncovered(transcript, cards) {
  const have = tokens(cards.map((c) => `${c.q} ${c.a}`).join(' '));
  return transcript.split('\n').map((l) => l.trim()).filter((l) => {
    if (!l || l === '---' || l.split(/\s+/).length < 2) return false;
    const t = [...tokens(l)];
    return t.length && t.filter((w) => have.has(w)).length / t.length < 0.5;
  });
}

// Picture cards make up about `share` of the set (from how picture-heavy the topics are), and never fewer than three.
const limitPics = (plain, pics, share) => pics.slice(0, Math.max(3, Math.ceil((plain.length * share) / (1 - share))));

export async function buildCards({ transcript, details, mode, onProgress }) {
  const figs = await findFigures(`${transcript}\n${details || ''}`);
  const share = pictureShare(`${transcript}\n${details || ''}`, figureGroups(figs)) || 0.3;
  if (mode !== 'ai') {
    const plain = basic.makeCards(transcript);
    return [...plain, ...limitPics(plain, [...diagramCards({ text: `${transcript}\n${details || ''}` }), ...figureCards(figs)], share)];
  }
  const cards = [];
  const chunks = chunkText(transcript, 2000);
  for (let i = 0; i < chunks.length; i++) {
    onProgress(`Writing cue cards (part ${i + 1} of ${chunks.length})...`);
    cards.push(...(await ai.makeCards(chunks[i], details)));
  }
  const missed = uncovered(transcript, cards);
  if (missed.length) {
    onProgress('Checking nothing was missed...');
    try { cards.push(...(await ai.makeCards(missed.join('\n'), details))); } catch { /* the main cards are still good */ }
  }
  return [...cards, ...limitPics(cards, [...diagramCards({ text: `${transcript}\n${details || ''}` }), ...figureCards(figs)], share)];
}

const tag = (list, level) => list.map((q) => ({ ...q, level: q.level || level }));
const rankOf = (q) => LEVEL_ORDER.indexOf(q.level || 'medium');
// With a mix of levels the quiz starts with the easiest questions and ends with the hardest.
const byLevel = (qs) => [...qs].sort((a, b) => rankOf(a) - rankOf(b));
const dedupe = (qs) => { const seen = new Set(); return qs.filter((q) => { const k = `${q.q}|${q.options ? q.options[q.answer] : q.answer}`; if (seen.has(k)) return false; seen.add(k); return true; }); };

// Questions that need a picture (cell diagrams, function graphs) take the place of some text questions.
// `levels` is the chosen difficulty levels: each one gets its share of the picture questions, and each level
// gives up as many text questions as it got pictures, so a mix of levels stays an even mix.
function withDiagrams(questions, { text, types, count, pics, figs = [], levels = ['medium'] }) {
  // How many have a picture depends on how picture-heavy the topics are; the rest stay plain (solve, define, explain).
  const share = pictureShare(text, figureGroups(figs));
  const limit = share ? Math.max(1, Math.round(count * share)) : 0;
  const counts = splitCount(count, levels);
  // text questions without one of the chosen levels (an AI that left it out) are spread over the levels in order
  const written = questions.map((q, i) => (q.level && levels.includes(q.level) ? q : { ...q, level: levels[Math.min(levels.length - 1, Math.floor((i / questions.length) * levels.length))] }));
  const pictures = levels.flatMap((l, i) => tag(diagramQuestions({ text, types, count: counts[i], extra: pics, share, difficulty: l }), l));
  const topics = (types.includes('mc') ? figureQuestions(figs, count, share) : []).map((q, i) => ({ ...q, level: levels[i % levels.length] }));
  const extra = dedupe([...pictures, ...topics]).slice(0, limit);
  const kept = levels.flatMap((l, i) => written.filter((q) => q.level === l).slice(0, Math.max(0, counts[i] - extra.filter((e) => e.level === l).length)));
  return byLevel([...kept, ...extra].map(fixMC).filter(Boolean));
}

export async function buildQuiz({ transcript, topic, details, grade, count, types, mode, onProgress, difficulty = 'medium' }) {
  const levels = levelsOf(difficulty);
  if (mode !== 'ai') {
    let text = transcript;
    if (!text && topic) {
      onProgress(`Looking up "${topic}"...`);
      text = await wikipediaText(topic);
      if (!text) throw new Error(`Couldn't find "${topic}" online. Paste some notes instead.`);
    }
    // each level makes its share; a level that comes up short (or repeats a fact) is topped up for that level only
    const counts = splitCount(count, levels);
    let qs = [];
    for (let t = 0; t < 5; t++) {
      for (const [i, l] of levels.entries()) {
        const have = qs.filter((q) => q.level === l).length;
        if (have >= counts[i]) continue;
        qs = dedupe([...qs, ...tag(basic.makeQuiz(text, { count: counts[i] - have + 2, types, grade, difficulty: l }), l)]);
      }
      if (levels.every((l, i) => qs.filter((q) => q.level === l).length >= counts[i])) break;
    }
    qs = levels.flatMap((l, i) => qs.filter((q) => q.level === l).slice(0, counts[i]));
    const figs = await findFigures(`${text}\n${topic || ''}\n${details || ''}`);
    const questions = withDiagrams(qs, { text: `${text}\n${topic || ''}\n${details || ''}`, types, count, figs, levels });
    if (!questions.length) throw new Error('Not enough text to build questions. Add more notes.');
    return { questions, source: text };
  }
  const chunks = chunkText(transcript || '', 6000);
  const parts = Math.max(chunks.length, 1);
  const questions = [];
  for (let i = 0; i < parts; i++) {
    onProgress(parts > 1 ? `Writing quiz questions (part ${i + 1} of ${parts})...` : 'Writing quiz questions...');
    questions.push(...(await ai.makeQuiz({
      source: chunks[i], topic, details, grade, types, difficulty: levels,
      count: Math.max(2, Math.ceil(count / parts)),
    })));
  }
  const all = `${transcript || ''}\n${topic || ''}\n${details || ''}`;
  const figs = await findFigures(all);
  // a single level is stamped on every question; with a mix, the AI's own "level" is used (medium if it left one out)
  const written = levels.length === 1 ? tag(questions.slice(0, count), levels[0]) : questions.slice(0, count);
  return { questions: withDiagrams(written, { text: all, types, count, figs, levels }), source: transcript };
}
