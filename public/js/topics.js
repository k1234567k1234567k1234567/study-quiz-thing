// Basic mode only: free Wikipedia text for a typed topic (no key needed).
async function wikiJSON(params) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Wikipedia is not reachable');
  return r.json();
}

export async function wikipediaText(topic) {
  const found = await wikiJSON({ action: 'query', list: 'search', srsearch: topic, srlimit: '1' });
  const title = found.query?.search?.[0]?.title;
  if (!title) return '';
  const page = await wikiJSON({ action: 'query', prop: 'extracts', explaintext: '1', exsectionformat: 'plain', titles: title });
  const extract = Object.values(page.query?.pages || {})[0]?.extract || '';
  return extract.replace(/\n{3,}/g, '\n\n').slice(0, 5000);
}
