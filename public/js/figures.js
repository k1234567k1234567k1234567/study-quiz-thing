// Real labelled diagrams from Wikimedia Commons (through /api/image), added to cue cards and quizzes
// for topics the code cannot draw itself. Each picture shows its credit line; if the lookup fails
// (offline, no server route, nothing found) the cards and quizzes are simply made without them.
const TOPICS = [
  // [pattern in the notes, search words, label, group]
  [/photosynthesis/i, 'photosynthesis', 'Photosynthesis', 'bio'],
  [/cellular respiration|krebs cycle|citric acid cycle|glycolysis|electron transport chain/i, 'cellular respiration', 'Cellular respiration', 'bio'],
  [/protein synthesis|transcription|translation|\bmrna\b|\btrna\b/i, 'protein synthesis', 'Protein synthesis', 'bio'],
  [/dna replication|replication fork|helicase/i, 'DNA replication', 'DNA replication', 'bio'],
  [/cell membrane|phospholipid|fluid mosaic|osmosis|diffusion|active transport/i, 'cell membrane transport', 'Cell membrane transport', 'bio'],
  [/digestive system|esophagus|small intestine|stomach|pancreas/i, 'human digestive system', 'The digestive system', 'bio'],
  [/circulatory system|\bheart\b|atrium|ventricle|aorta/i, 'human heart', 'The human heart', 'bio'],
  [/respiratory system|alveoli|bronch\w+|diaphragm/i, 'human respiratory system', 'The respiratory system', 'bio'],
  [/nephron|kidney|excretory system/i, 'nephron kidney', 'The kidney and nephron', 'bio'],
  [/immune system|antibod\w+|white blood cells?|lymphocytes?/i, 'immune response', 'The immune response', 'bio'],
  [/food web|food chain|trophic level|producers?.{0,40}consumers?/i, 'food web', 'A food web', 'eco'],
  [/carbon cycle/i, 'carbon cycle', 'The carbon cycle', 'eco'],
  [/nitrogen cycle|nitrogen fixation/i, 'nitrogen cycle', 'The nitrogen cycle', 'eco'],
  [/water cycle|hydrologic cycle|evaporation.{0,60}condensation/i, 'water cycle', 'The water cycle', 'eco'],
  [/rock cycle|igneous|sedimentary|metamorphic/i, 'rock cycle', 'The rock cycle', 'earth'],
  [/plate tectonics|convergent boundar\w+|divergent boundar\w+|subduction/i, 'plate tectonics boundaries', 'Plate tectonics', 'earth'],
  [/layers of the earth|earth.s (crust|mantle|core)/i, 'layers of the Earth', 'Layers of the Earth', 'earth'],
  [/greenhouse effect/i, 'greenhouse effect', 'The greenhouse effect', 'earth'],
  [/electromagnetic spectrum|gamma rays?|infrared|ultraviolet/i, 'electromagnetic spectrum', 'The electromagnetic spectrum', 'phys'],
  [/periodic table|alkali metals?|halogens?|noble gas/i, 'periodic table of elements', 'The periodic table', 'chem'],
  [/ionic bond|covalent bond|lewis (dot )?structure|bohr.rutherford|valence electrons?/i, 'chemical bonding', 'Chemical bonding', 'chem'],
  [/electrolytic cell|galvanic cell|voltaic cell|electrochemical/i, 'electrochemical cell', 'An electrochemical cell', 'chem'],
  [/endothermic|exothermic|activation energy/i, 'activation energy reaction', 'Reaction energy diagram', 'chem'],
  [/lens|refraction|ray diagram|focal length|concave mirror|convex/i, 'ray diagram lens', 'A lens ray diagram', 'phys'],
  [/magnetic field|electromagnet|right.hand rule/i, 'magnetic field', 'A magnetic field', 'phys'],
  [/simple machines?|lever|pulley|inclined plane/i, 'simple machines', 'Simple machines', 'phys'],
];

export function figureTopics(text, skip = []) {
  const t = text || '';
  return TOPICS.filter(([re, , label]) => re.test(t) && !skip.includes(label)).map(([, query, label, group]) => ({ query, label, group }));
}

const fetchWith = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

// One picture per topic, at most `max` topics, looked up together.
export async function findFigures(text, max = 4) {
  const topics = figureTopics(text).slice(0, max);
  const found = await Promise.all(topics.map(async (t) => {
    try {
      const { results } = await fetchWith(`/api/image?q=${encodeURIComponent(t.query)}&n=1`);
      const p = results?.[0];
      return p?.src ? { ...t, diagram: { kind: 'photo', src: p.src, page: p.page, title: p.title, credit: `${p.artist} · ${p.license}`, alt: t.label } } : null;
    } catch { return null; }
  }));
  return found.filter(Boolean);
}

export function figureCards(figs) {
  return figs.map((f) => ({
    q: `Look at this diagram. What does it show?`, a: `${f.label}\nDiagram: ${f.diagram.title}`, topic: 'Diagrams', diagram: f.diagram, weak: false,
  }));
}

const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// Multiple choice only: the picture was found by searching for the label, and the wrong answers come from other topics.
export function figureQuestions(figs, count) {
  const labels = TOPICS.map((t) => t[2]);
  return figs.slice(0, Math.max(1, Math.round(count * 0.2))).map((f) => {
    const sameGroup = TOPICS.filter((t) => t[3] === f.group && t[2] !== f.label).map((t) => t[2]);
    const wrong = shuffle([...new Set([...shuffle(sameGroup), ...shuffle(labels)])].filter((l) => l !== f.label)).slice(0, 3);
    const options = shuffle([f.label, ...wrong]);
    return { type: 'mc', q: 'Which topic does this diagram show?', options, answer: options.indexOf(f.label), explanation: `The diagram shows: ${f.label}.`, topic: 'Diagrams', diagram: f.diagram };
  });
}
