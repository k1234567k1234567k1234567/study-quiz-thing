// Shared by the Vercel functions and server.js.
// Text goes to Groq first when GROQ_API_KEY is set (it is much faster), then to NVIDIA.
// Photos always go to NVIDIA, which has the vision model.
const DEFAULT_VISION = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
// Fast model first; the next one is tried automatically if NVIDIA says it is retired or missing.
const DEFAULT_TEXT = `meta/llama-3.1-8b-instruct,${DEFAULT_VISION}`;
// Groq retired its Llama 3.x models on the free tier in Aug 2026; GPT-OSS replaces them.
const DEFAULT_GROQ = 'openai/gpt-oss-120b,openai/gpt-oss-20b';
const list = (v, fallback) => (v || fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const baseUrl = () => (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
export const groqUrl = () => (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
export const textModels = () => list(process.env.NVIDIA_MODEL, DEFAULT_TEXT);
export const visionModels = () => list(process.env.NVIDIA_VISION_MODEL, DEFAULT_VISION);
export const groqModels = () => list(process.env.GROQ_MODEL, DEFAULT_GROQ);
export const hasNvidia = () => Boolean(process.env.NVIDIA_API_KEY && !/^nvapi-x+$/i.test(process.env.NVIDIA_API_KEY));
export const hasGroq = () => Boolean(process.env.GROQ_API_KEY && !/^gsk_x+$/i.test(process.env.GROQ_API_KEY));
export const hasKey = () => hasNvidia() || hasGroq();

export function describe() {
  const text = hasGroq() ? groqModels()[0] : textModels()[0];
  return { ai: hasKey(), model: text, visionModel: visionModels()[0], textProvider: hasGroq() ? 'groq' : 'nvidia', photos: hasNvidia() };
}

// Ordered list of places to send a request: { name, url, key, model, timeout }.
export function targets(vision) {
  const out = [];
  if (!vision && hasGroq()) {
    for (const model of groqModels()) out.push({ name: 'Groq', url: groqUrl(), key: process.env.GROQ_API_KEY, model, timeout: 15000 });
  }
  if (hasNvidia()) {
    for (const model of vision ? visionModels() : textModels()) out.push({ name: 'NVIDIA', url: baseUrl(), key: process.env.NVIDIA_API_KEY, model, timeout: 26000 });
  }
  return out;
}

const RETIRED = /end of life|end-of-life|retired|deprecat|decommission|no longer|not found|does not exist/i;

// Reasoning models put their thinking in <think> tags; the site only wants the answer.
export function cleanReply(text) {
  try {
    const data = JSON.parse(text);
    for (const c of data.choices || []) {
      const m = c.message;
      if (m && typeof m.content === 'string') m.content = m.content.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*<\/think>/i, '').trim();
    }
    return JSON.stringify(data);
  } catch { return text; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BUSY = new Set([500, 502, 503, 504]);

// Tries each target in turn when one is retired, missing, busy, slow or rate limited.
// Returns { status, body } where body is an object for errors or the raw JSON text on success.
export async function forward(payload) {
  const list = targets(Boolean(payload.vision));
  if (!list.length) {
    const msg = payload.vision ? 'Reading photos needs NVIDIA_API_KEY to be set.' : 'No API key is set.';
    return { status: 503, body: { error: 'no_key', message: msg } };
  }
  const deadline = Date.now() + 52000; // stay under the 60s function limit
  let last;
  for (let pass = 0; pass < 2; pass++) {
    let sawBusy = false;
    for (const t of list) {
      const left = deadline - Date.now();
      if (left < 3000) return last || { status: 503, body: { error: 'busy', message: 'The AI is busy right now.' } };
      const body = {
        model: t.model,
        messages: payload.messages,
        max_tokens: Math.min(Number(payload.max_tokens) || 2048, 8192),
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.3,
        stream: false,
      };
      // NVIDIA's own Nemotron sample sets a thinking budget; a small one keeps answers fast.
      if (t.name === 'NVIDIA' && /nemotron/i.test(t.model)) body.reasoning_budget = 1500;
      if (t.name === 'Groq' && /gpt-oss/i.test(t.model)) body.reasoning_effort = 'low'; // answer fast
      let up, text;
      try {
        up = await fetch(`${t.url}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${t.key}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(left, t.timeout)),
        });
        text = await up.text();
      } catch (e) {
        // A timeout or dropped connection is usually a slow server, so treat it like "busy" and move on.
        sawBusy = true;
        last = { status: 503, body: { error: 'busy', message: `${t.name} took too long to answer (model ${t.model}).` } };
        continue;
      }
      if (up.ok) return { status: 200, body: cleanReply(text) };
      if (up.status === 401 || up.status === 403) {
        last = { status: 401, body: { error: 'bad_key', message: `${t.name} rejected the API key` } };
        if (t.name === 'NVIDIA' && !list.some((x) => x !== t && x.name !== 'NVIDIA')) return last;
        continue;
      }
      if (up.status === 429) {
        last = { status: 429, body: { error: 'rate', message: `${t.name} rate limit hit`, retryAfter: Number(up.headers.get('retry-after')) || 10 } };
        continue;
      }
      if (BUSY.has(up.status)) {
        sawBusy = true;
        last = { status: 503, body: { error: 'busy', message: `${t.name} is busy (model ${t.model}, error ${up.status}).` } };
        continue;
      }
      last = { status: 502, body: { error: 'upstream', message: `${t.name} error ${up.status} for model ${t.model}: ${text.slice(0, 300)}` } };
      if (!(up.status === 404 || up.status === 410 || RETIRED.test(text))) {
        // A bad request is our fault, so try the next target once rather than giving up completely.
        continue;
      }
    }
    if (!sawBusy) return last;
    await sleep(2000);
  }
  return last;
}

// Sends a tiny prompt to every target the site can use, so problems show up in one place.
// Never returns key text: error snippets have any key removed.
export async function selfTest() {
  const keys = [process.env.NVIDIA_API_KEY, process.env.GROQ_API_KEY].filter(Boolean);
  const scrub = (t) => keys.reduce((out, k) => out.split(k).join('***'), String(t)).replace(/\s+/g, ' ').slice(0, 200);
  const jobs = [
    ...targets(false).map((t) => ({ t, used: 'cards and quizzes' })),
    ...targets(true).map((t) => ({ t, used: 'reading photos' })),
  ];
  const results = await Promise.all(jobs.map(async ({ t, used }) => {
    const started = Date.now();
    const base = { provider: t.name, model: t.model, used };
    try {
      const body = { model: t.model, messages: [{ role: 'user', content: 'Reply with the single word OK.' }], max_tokens: 64, temperature: 0, stream: false };
      if (t.name === 'NVIDIA' && /nemotron/i.test(t.model)) body.reasoning_budget = 64;
      if (t.name === 'Groq' && /gpt-oss/i.test(t.model)) body.reasoning_effort = 'low';
      const up = await fetch(`${t.url}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t.key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const text = await up.text();
      return { ...base, ok: up.ok, status: up.status, ms: Date.now() - started, ...(up.ok ? {} : { error: scrub(text) }) };
    } catch (e) {
      return { ...base, ok: false, status: 0, ms: Date.now() - started, error: scrub(e.message) };
    }
  }));
  return {
    keys: {
      NVIDIA_API_KEY: hasNvidia() ? 'set' : 'missing',
      GROQ_API_KEY: hasGroq() ? 'set' : 'missing',
      nvidiaFormatLooksRight: !process.env.NVIDIA_API_KEY || /^nvapi-/.test(process.env.NVIDIA_API_KEY),
      groqFormatLooksRight: !process.env.GROQ_API_KEY || /^gsk_/.test(process.env.GROQ_API_KEY),
    },
    results,
  };
}
