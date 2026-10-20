// Shared by the Vercel functions and server.js. The key comes from NVIDIA_API_KEY.
const DEFAULT_VISION = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
// Fast model first; the next one is tried automatically if NVIDIA says it is retired or missing.
const DEFAULT_TEXT = `meta/llama-3.1-8b-instruct,${DEFAULT_VISION}`;
const list = (v, fallback) => (v || fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const baseUrl = () => (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
export const textModels = () => list(process.env.NVIDIA_MODEL, DEFAULT_TEXT);
export const visionModels = () => list(process.env.NVIDIA_VISION_MODEL, DEFAULT_VISION);
export const hasKey = () => Boolean(process.env.NVIDIA_API_KEY && !/^nvapi-x+$/i.test(process.env.NVIDIA_API_KEY));

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

// Tries each configured model in turn when NVIDIA says one is retired, missing or busy.
// Returns { status, body } where body is an object for errors or the raw JSON text on success.
export async function forward(payload) {
  const models = payload.vision ? visionModels() : textModels();
  const deadline = Date.now() + 52000; // stay under the 60s function limit
  let last;
  for (let pass = 0; pass < 2; pass++) {
    let sawBusy = false;
    for (const model of models) {
      const left = deadline - Date.now();
      if (left < 3000) return last || { status: 502, body: { error: 'busy', message: 'NVIDIA is busy right now.' } };
      const body = {
        model,
        messages: payload.messages,
        max_tokens: Math.min(Number(payload.max_tokens) || 2048, 8192),
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.3,
        stream: false,
      };
      // NVIDIA's own Nemotron sample sets a thinking budget; a small one keeps answers fast.
      if (/nemotron/i.test(model)) body.reasoning_budget = 1500;
      let up, text;
      try {
        up = await fetch(`${baseUrl()}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(left, 38000)),
        });
        text = await up.text();
      } catch (e) {
        return { status: 502, body: { error: 'upstream', message: `Could not reach NVIDIA: ${e.message}` } };
      }
      if (up.status === 401 || up.status === 403) return { status: 401, body: { error: 'bad_key', message: 'NVIDIA rejected the API key' } };
      if (up.status === 429) return { status: 429, body: { error: 'rate', message: 'NVIDIA rate limit hit', retryAfter: Number(up.headers.get('retry-after')) || 10 } };
      if (up.ok) return { status: 200, body: cleanReply(text) };
      if (BUSY.has(up.status)) {
        sawBusy = true;
        last = { status: 503, body: { error: 'busy', message: `NVIDIA's free servers are busy (model ${model}, error ${up.status}).` } };
        continue;
      }
      last = { status: 502, body: { error: 'upstream', message: `NVIDIA error ${up.status} for model ${model}: ${text.slice(0, 300)}` } };
      if (!(up.status === 404 || up.status === 410 || RETIRED.test(text))) return last;
    }
    if (!sawBusy) return last;
    await sleep(2000);
  }
  return last;
}
