// Decorative illustrations from Hugging Face (FLUX), used only as project banners. Needs HF_TOKEN (free account).
// Never used for diagrams: image models garble labels, so anything a student answers from is drawn by code or comes from Commons.
const DEFAULT_MODEL = 'black-forest-labs/FLUX.1-schnell';
export const hasArt = () => Boolean(process.env.HF_TOKEN && !/^hf_x+$/i.test(process.env.HF_TOKEN));
const model = () => (process.env.HF_IMAGE_MODEL || DEFAULT_MODEL).trim();
const base = () => (process.env.HF_BASE_URL || 'https://router.huggingface.co/hf-inference/models').replace(/\/$/, '');

const STYLE = 'soft flat vector illustration, dark charcoal background, gentle violet and amber accents, simple shapes, calm, no text, no letters, no words, no labels';

// Returns { status, type, buf } or { status, error } and never includes the token in an error.
export async function makeArt(topic) {
  if (!hasArt()) return { status: 503, error: 'No HF_TOKEN set' };
  const subject = String(topic).replace(/[^\p{L}\p{N} ,.'-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (subject.length < 3) return { status: 400, error: 'topic required' };
  const body = { inputs: `${subject}, ${STYLE}`, parameters: { width: 768, height: 320 } };
  for (let tries = 0; tries < 2; tries++) {
    let r;
    try {
      r = await fetch(`${base()}/${model()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json', Accept: 'image/jpeg' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(40000),
      });
    } catch { return { status: 504, error: 'The image service took too long' }; }
    if (r.status === 503 && tries === 0) { await new Promise((res) => setTimeout(res, 4000)); continue; } // model still loading
    if (r.status === 401 || r.status === 403) return { status: 401, error: 'Hugging Face rejected the token' };
    if (r.status === 429) return { status: 429, error: 'Image limit reached for now' };
    if (!r.ok) return { status: 502, error: `Image service error ${r.status}` };
    const type = r.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return { status: 502, error: 'The image service sent something that is not a picture' };
    return { status: 200, type, buf: Buffer.from(await r.arrayBuffer()) };
  }
  return { status: 503, error: 'The image model is still loading' };
}
