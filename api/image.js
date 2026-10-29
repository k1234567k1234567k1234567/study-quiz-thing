import { findImages } from './_commons.js';

export default async function handler(req, res) {
  const q = String(req.query?.q || '').trim().slice(0, 80);
  if (q.length < 3) return res.status(400).json({ error: 'bad_request', message: 'q required' });
  try {
    const results = await findImages(q, Math.min(Number(req.query?.n) || 3, 6));
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ results });
  } catch (e) {
    res.status(502).json({ error: 'upstream', message: e.message });
  }
}
