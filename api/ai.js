import { forward, hasKey } from './_ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'bad_request', message: 'POST only' });
  if (!hasKey()) return res.status(503).json({ error: 'no_key', message: 'No NVIDIA_API_KEY or GROQ_API_KEY set in Vercel environment variables' });
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  if (!Array.isArray(payload.messages) || !payload.messages.length) {
    return res.status(400).json({ error: 'bad_request', message: 'messages required' });
  }
  const { status, body } = await forward(payload);
  if (typeof body === 'string') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).send(body);
  }
  res.status(status).json(body);
}
