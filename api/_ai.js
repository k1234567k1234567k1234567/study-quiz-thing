// Shared by the Vercel functions and server.js. The key comes from NVIDIA_API_KEY.
const DEFAULT_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
const list = (v, fallback) => (v || fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const baseUrl = () => (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
export const textModels = () => list(process.env.NVIDIA_MODEL, DEFAULT_MODEL);
export const visionModels = () => list(process.env.NVIDIA_VISION_MODEL, DEFAULT_MODEL);
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

// Tries each configured model in turn when NVIDIA says one is retired or missing.
// Returns { status, body } where body is an object for errors or the raw JSON text on success.
export async function forward(payload) {
  const models = payload.vision ? visionModels() : textModels();
  let last;
  for (const model of models) {
    const body = {
      model,
      messages: payload.messages,
      max_tokens: Math.min(Number(payload.max_tokens) || 2048, 8192),
      temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.3,
      stream: false,
    };
    let up, text;
    try {
      up = await fetch(`${baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(55000),
      });
      text = await up.text();
    } catch (e) {
      return { status: 502, body: { error: 'upstream', message: `Could not reach NVIDIA: ${e.message}` } };
    }
    if (up.status === 401 || up.status === 403) return { status: 401, body: { error: 'bad_key', message: 'NVIDIA rejected the API key' } };
    if (up.status === 429) return { status: 429, body: { error: 'rate', message: 'NVIDIA rate limit hit', retryAfter: Number(up.headers.get('retry-after')) || 10 } };
    if (up.ok) return { status: 200, body: cleanReply(text) };
    last = { status: 502, body: { error: 'upstream', message: `NVIDIA error ${up.status} for model ${model}: ${text.slice(0, 300)}` } };
    if (!(up.status === 404 || up.status === 410 || RETIRED.test(text))) return last;
  }
  return last;
}
