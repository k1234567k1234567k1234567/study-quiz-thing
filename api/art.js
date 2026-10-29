import { makeArt } from './_art.js';

export default async function handler(req, res) {
  const out = await makeArt(String(req.query?.q || ''));
  if (out.status !== 200) return res.status(out.status).json({ error: 'art', message: out.error });
  res.setHeader('Content-Type', out.type);
  // The same topic always maps to the same URL, so the browser and Vercel keep it instead of generating again.
  res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
  res.status(200).send(out.buf);
}
