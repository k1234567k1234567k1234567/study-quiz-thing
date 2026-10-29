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

// Commons keeps one diagram in many languages ("Photosynthesis-gl", "Protein synthesis ku", "Periodic table (German)").
// Labels in another language are no use to an English student, so those files are skipped and English ones come first.
const OTHER = 'ar|ku|cy|vi|de|fr|es|pt|it|ru|zh|ja|ko|hy|gl|pl|nl|sv|tr|fa|he|hi|id|th|uk|cs|el|hu|ro|fi|da|no|nb|nn|ca|bg|sr|hr|sk|sl|et|lt|lv|eu|ms|bn|ta|te|ml|ur|sq|mk|az|ka|be|af|sw|la|eo|oc|br|gd|ga|is|mt|pt-br|zh-hans|zh-hant|zh-cn|zh-tw';
const NAMES = 'espanol|deutsch|francais|italiano|portugues|nederlands|svenska|german|french|spanish|portuguese|italian|russian|chinese|japanese|korean|arabic|turkish|polish|dutch|swedish|persian|hebrew|hindi|indonesian|thai|ukrainian|czech|greek|hungarian|romanian|finnish|danish|norwegian|vietnamese|catalan|bulgarian|serbian|croatian';
// Letters outside the Latin alphabet in a file name (Chinese, Arabic, Cyrillic, ...) also mean a diagram labelled in that language.
const NON_LATIN = /[^\u0000-\u024f\u1e00-\u1eff\u2000-\u206f\u2190-\u22ff\s]/;
const foreign = (title) => NON_LATIN.test(title) || new RegExp(`(?:[ _-](?:${OTHER})$|\\((?:${NAMES}|${OTHER})\\)|[ _-](?:${NAMES})$)`, 'i').test(title);
const english = (title) => /(?:[ _-]|^)(?:en|eng|english)$|\(english\)/i.test(title);

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
      if (foreign(title)) continue;
      const text = `${title} ${plain(meta.ImageDescription?.value)}`.toLowerCase();
      if (need.w.length && need.w.filter((w) => text.includes(w)).length < need.min) continue;
      out.push({
        title, src: info.thumburl, page: info.descriptionurl, license,
        artist: plain(meta.Artist?.value).slice(0, 80) || 'Wikimedia Commons',
        w: info.thumbwidth, h: info.thumbheight, en: english(title),
      });
    }
    if (out.filter((x) => x.en).length >= limit) break;
  }
  // English-labelled files first, then ones with no language mark, keeping Commons' own order within each group
  const best = [...out.filter((x) => x.en), ...out.filter((x) => !x.en)].slice(0, limit).map(({ en, ...rest }) => rest);
  cache.set(key, { t: Date.now(), v: best });
  return best;
}
