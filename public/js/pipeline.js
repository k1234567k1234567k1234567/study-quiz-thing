// Ties photos / notes / topics to cards and quizzes, in AI mode or basic mode.
import * as ai from './ai.js';
import * as basic from './generate.js';
import { ocrImages } from './ocr.js';
import { wikipediaText } from './topics.js';
import { diagramQuestions, diagramCards } from './diagramq.js';

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

export async function buildCards({ transcript, details, mode, onProgress }) {
  if (mode !== 'ai') return [...basic.makeCards(transcript), ...diagramCards({ text: `${transcript}\n${details || ''}` })];
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
  return [...cards, ...diagramCards({ text: `${transcript}\n${details || ''}` })];
}

// Questions that need a picture (cell diagrams, function graphs) replace the last few text questions.
function withDiagrams(questions, { text, types, count, pics }) {
  const extra = diagramQuestions({ text, types, count, extra: pics });
  return extra.length ? [...questions.slice(0, Math.max(0, count - extra.length)), ...extra] : questions;
}

export async function buildQuiz({ transcript, topic, details, grade, count, types, mode, onProgress }) {
  if (mode !== 'ai') {
    let text = transcript;
    if (!text && topic) {
      onProgress(`Looking up "${topic}"...`);
      text = await wikipediaText(topic);
      if (!text) throw new Error(`Couldn't find "${topic}" online. Paste some notes instead.`);
    }
    const qs = basic.makeQuiz(text, { count, types, grade });
    const questions = withDiagrams(qs, { text: `${text}\n${topic || ''}\n${details || ''}`, types, count });
    if (!questions.length) throw new Error('Not enough text to build questions. Add more notes.');
    return { questions, source: text };
  }
  const chunks = chunkText(transcript || '', 6000);
  const parts = Math.max(chunks.length, 1);
  const questions = [];
  for (let i = 0; i < parts; i++) {
    onProgress(parts > 1 ? `Writing quiz questions (part ${i + 1} of ${parts})...` : 'Writing quiz questions...');
    questions.push(...(await ai.makeQuiz({
      source: chunks[i], topic, details, grade, types,
      count: Math.max(2, Math.ceil(count / parts)),
    })));
  }
  const all = `${transcript || ''}\n${topic || ''}\n${details || ''}`;
  return { questions: withDiagrams(questions.slice(0, count), { text: all, types, count }), source: transcript };
}
