import { BASE_URL, TEXT_MODEL, VISION_MODEL, hasKey } from './_ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'bad_request', message: 'POST only' });
  if (!hasKey()) return res.status(503).json({ error: 'no_key', message: 'No NVIDIA_API_KEY set in Vercel environment variables' });
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  if (!Array.isArray(payload.messages) || !payload.messages.length) {
    return res.status(400).json({ error: 'bad_request', message: 'messages required' });
  }
  const body = {
    model: payload.vision ? VISION_MODEL : TEXT_MODEL,
    messages: payload.messages,
    max_tokens: Math.min(Number(payload.max_tokens) || 2048, 4096),
    temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.3,
    stream: false,
  };
  try {
    const up = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55000),
    });
    const text = await up.text();
    if (up.status === 401 || up.status === 403) return res.status(401).json({ error: 'bad_key', message: 'NVIDIA rejected the API key' });
    if (up.status === 429) return res.status(429).json({ error: 'rate', message: 'NVIDIA rate limit hit', retryAfter: Number(up.headers.get('retry-after')) || 10 });
    if (!up.ok) return res.status(502).json({ error: 'upstream', message: `NVIDIA error ${up.status}: ${text.slice(0, 300)}` });
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream', message: `Could not reach NVIDIA: ${e.message}` });
  }
}
