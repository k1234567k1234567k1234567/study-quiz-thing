// Finds real, human-made diagrams on Wikimedia Commons (free, no key). Shared by the Vercel function and server.js.
// Only openly licensed files are returned, each with the credit line that has to be shown next to it.
const UA = 'StudyHub/1.0 (https://github.com/k1234567k1234567k1234567/study-quiz-thing; school study tool)';
const API = () => (process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php');
const OPEN = /^(cc[ -]?(by|0|zero)|public domain|pd\b|gfdl|attribution)/i;

const plain = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const GENERIC = new Set(['diagram', 'human', 'system', 'process']);
const words = (s) => (String(s).toLowerCase().match(/[a-z]{3,}/g) || []);
// A file only counts if it names the topic itself: every distinctive word (all but one when there are three or more).
const needed = (q) => { const w = words(q).filter((x) => !GENERIC.has(x)); return { w, min: w.length >= 3 ? w.length - 1 : w.length }; };

const cache = new Map();
const TTL = 6 * 3600 * 1000;

async function search(q, kind) {
  const url = `${API()}?${new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '10',
    gsrsearch: `${q} diagram filetype:${kind}`,
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '720',
    iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription',
  })}`;
  let r;
  for (let tries = 0; tries < 2; tries++) {
    r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: AbortSignal.timeout(8000) });
    if (r.status !== 429) break;
    await new Promise((res) => setTimeout(res, 1500)); // Wikimedia asks callers to back off when busy
  }
  if (!r.ok) throw new Error(`Commons ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(`Commons: ${data.error.code}`);
  return Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
}

// Returns up to `limit` pictures whose file name or description mentions a word of the search.
export async function findImages(q, limit = 3) {
  const key = `${q}|${limit}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const need = needed(q);
  const out = [];
  for (const kind of ['drawing', 'bitmap']) {
    let pages;
    try { pages = await search(q, kind); } catch (e) { if (!out.length && kind === 'bitmap') throw e; continue; }
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info?.thumburl || info.width < 300) continue;
      const meta = info.extmetadata || {};
      const license = plain(meta.LicenseShortName?.value);
      if (!OPEN.test(license)) continue;
      const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
      const text = `${title} ${plain(meta.ImageDescription?.value)}`.toLowerCase();
      if (need.w.length && need.w.filter((w) => text.includes(w)).length < need.min) continue;
      out.push({
        title, src: info.thumburl, page: info.descriptionurl, license,
        artist: plain(meta.Artist?.value).slice(0, 80) || 'Wikimedia Commons',
        w: info.thumbwidth, h: info.thumbheight,
      });
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  cache.set(key, { t: Date.now(), v: out });
  return out;
}
