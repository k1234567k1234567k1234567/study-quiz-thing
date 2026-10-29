// Talks to our own server (/api/ai), which holds the NVIDIA key.
import { TRANSCRIBE, CARD_SYSTEM, quizSystem } from './prompts.js';
import { fixMC } from './options.js';

export class AIError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

let photosOk = true;
// Photos need the NVIDIA vision model; with only a Groq key the browser reads them itself (OCR).
export const canReadPhotos = () => photosOk;
let artOk = false;
export const hasArt = () => artOk;

export async function status() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok) return { ai: false };
    const info = await r.json();
    photosOk = info.photos !== false;
    artOk = info.art === true;
    return info;
  } catch { return { ai: false, offline: true }; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function chat(messages, { vision = false, maxTokens = 3000, temperature = 0.3, retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    let r;
    try {
      r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, vision, max_tokens: maxTokens, temperature }),
      });
    } catch { throw new AIError('Could not reach the Study Hub server. Is it running?', 'offline'); }
    const body = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = body.choices?.[0]?.message?.content;
      if (!text) throw new AIError('The AI returned an empty answer.', 'empty');
      return text;
    }
    if (body.error === 'busy' && attempt < retries) { await sleep([3, 6, 10][attempt] * 1000); continue; }
    if (body.error === 'rate' && attempt < retries) { await sleep(Math.min(body.retryAfter || 5, 30) * 1000); continue; }
    throw new AIError(body.message || `AI request failed (${r.status})`, body.error || 'upstream');
  }
}

// Models often wrap JSON in fences or add chatter; pull out the first JSON value.
export function parseJSON(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.search(/[\[{]/);
  if (start < 0) throw new Error('no json');
  const open = cleaned[start];
  const end = cleaned.lastIndexOf(open === '[' ? ']' : '}');
  if (end <= start) throw new Error('no json');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function jsonCall(messages, opts, normalize) {
  let lastErr;
  for (let i = 0; i < 2; i++) {
    const text = await chat(messages, { ...opts, temperature: i ? 0.1 : opts.temperature });
    try {
      const out = normalize(parseJSON(text));
      if (out.length) return out;
      lastErr = new Error('empty list');
    } catch (e) { lastErr = e; }
  }
  throw new AIError('The AI did not return usable results. Try again, or use fewer/clearer photos.', 'bad_json');
}

export async function transcribe(images, onProgress = () => {}) {
  const parts = [];
  const batch = 1;
  for (let i = 0; i < images.length; i += batch) {
    onProgress(`Reading photos ${i + 1}-${Math.min(i + batch, images.length)} of ${images.length}...`);
    const content = [{ type: 'text', text: TRANSCRIBE }, ...images.slice(i, i + batch).map((url) => ({ type: 'image_url', image_url: { url } }))];
    parts.push((await chat([{ role: 'user', content }], { vision: true, maxTokens: 4000, temperature: 0.1 })).trim());
  }
  return parts.join('\n---\n');
}

const asText = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

export async function makeCards(chunk, details) {
  const user = `${details ? `Student focus (still cover everything, but be extra thorough here): ${details}\n\n` : ''}NOTES:\n${chunk}`;
  return jsonCall(
    [{ role: 'system', content: CARD_SYSTEM }, { role: 'user', content: user }],
    { maxTokens: 4500, temperature: 0.3 },
    (arr) => (Array.isArray(arr) ? arr : arr.cards || [])
      .map((c) => ({ q: asText(c.q ?? c.question), a: asText(c.a ?? c.answer), topic: asText(c.topic) }))
      .filter((c) => c.q && c.a),
  );
}

function normQuestion(q) {
  const type = ['mc', 'tf', 'fill', 'short'].includes(q.type) ? q.type : null;
  const text = asText(q.q ?? q.question);
  if (!type || !text) return null;
  const out = { type, q: text, explanation: asText(q.explanation), topic: asText(q.topic) };
  if (type === 'mc') {
    const options = (q.options || []).map(asText).filter(Boolean);
    if (options.length < 2) return null;
    let ans = q.answer;
    if (typeof ans === 'string') {
      const letter = ans.trim().match(/^([A-Da-d])[).:]?$/);
      if (letter) ans = letter[1].toUpperCase().charCodeAt(0) - 65;
      else if (/^\d+$/.test(ans.trim())) ans = Number(ans);
      else ans = options.findIndex((o) => o.toLowerCase() === ans.trim().toLowerCase());
    }
    if (!Number.isInteger(ans) || ans < 0 || ans >= options.length) return null;
    return fixMC({ ...out, options, answer: ans });
  }
  if (type === 'tf') {
    const a = typeof q.answer === 'string' ? q.answer.trim().toLowerCase() === 'true' : Boolean(q.answer);
    return { ...out, answer: a };
  }
  const answer = asText(q.answer);
  return answer ? { ...out, answer } : null;
}

export function makeQuiz({ source, topic, details, grade, count, types, difficulty }) {
  const hasNotes = Boolean(source && source.trim());
  const user = [
    topic && `Topic: ${topic}`,
    details && `Go into detail on: ${details}`,
    hasNotes && `NOTES:\n${source}`,
  ].filter(Boolean).join('\n\n');
  return jsonCall(
    [{ role: 'system', content: quizSystem({ grade, count, types, hasNotes, difficulty }) }, { role: 'user', content: user }],
    { maxTokens: 4500, temperature: 0.5 },
    (arr) => (Array.isArray(arr) ? arr : arr.questions || []).map(normQuestion).filter(Boolean),
  );
}
