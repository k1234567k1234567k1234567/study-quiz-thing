// Asks the AI to design a simple labelled picture for topics that the built-in pictures (cells, neuron,
// function graphs) do not cover, e.g. the heart, a circuit or the water cycle. The AI returns plain shapes
// and labelled points; cleanSpec() in diagrams.js checks them before anything is drawn.
import { chat, parseJSON } from './ai.js';
import { cleanSpec } from './diagrams.js';

const SYSTEM = `You design simple labelled teaching diagrams for a school quiz. Reply with ONLY JSON, no prose, no code fences: {"diagrams":[ ... ]}

From the student's topics or notes, pick up to 3 topics that are normally taught with a picture where the student has to NAME a part (for example the heart, digestive system, eye, flower, DNA, circuit, water cycle, layers of the Earth, atom, food chain, volcano). If none suit a picture, reply {"diagrams":[]}.
Do NOT draw animal cells, plant cells, neurons or graphs of functions: those already exist.

Each diagram: {"title":"Human heart","shapes":[...],"parts":[...]}
The canvas is 100 wide and 70 tall, origin at the top left.
"shapes": 6 to 30 simple shapes drawn back to front:
 {"t":"ellipse","cx":50,"cy":35,"rx":20,"ry":14,"fill":1}
 {"t":"circle","cx":,"cy":,"r":,"fill":}
 {"t":"rect","x":,"y":,"w":,"h":,"fill":}
 {"t":"line","x1":,"y1":,"x2":,"y2":,"w":2,"fill":}
 {"t":"poly","pts":[[x,y],[x,y],[x,y]],"fill":}
"fill" is a colour number: 0 grey, 1 red, 2 orange, 3 yellow, 4 green, 5 teal, 6 blue, 7 purple.
NEVER put any text, letters or labels inside the picture.
"parts": 4 to 8 items {"name":"Left ventricle","x":60,"y":40,"info":"One short sentence on what it does."}
Each part is a different shape in the picture. (x,y) must be a point INSIDE that part's shape. Keep parts at least 10 apart.
Keep the drawing simple and correct for a school student.`;

const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// Same shape as the built-in problems in diagramq.js, so the quiz and card builders can mix them in.
export function problemsFor(spec) {
  const names = spec.parts.map((p) => p.name);
  const out = [];
  shuffle(spec.parts.map((_, i) => i)).forEach((target, idx) => {
    const part = spec.parts[target];
    const others = shuffle(spec.parts.filter((p) => p !== part));
    const diagram = { kind: 'ai', title: spec.title, shapes: spec.shapes, parts: spec.parts, target };
    const info = part.info ? ` ${part.info}` : '';
    out.push({
      kind: 'name', diagram, name: part.name, others: others.map((p) => p.name),
      prompt: `In this diagram of ${spec.title}, what is the name of the part the arrow points to?`, answer: part.name,
      wrong: others.slice(0, 3).map((p) => p.name),
      explain: `${part.name}.${info}`, backText: `${part.name}.${info}`,
    });
    if (idx < 3 && part.info && others.filter((p) => p.info).length >= 3) {
      out.push({
        kind: 'job', diagram, name: part.name,
        prompt: `In this diagram of ${spec.title}, what does the part the arrow points to do?`, answer: part.info,
        wrong: others.filter((p) => p.info).slice(0, 3).map((p) => p.info),
        explain: `The arrow points to the ${part.name}.`, backText: `${part.name}. ${part.info}`,
      });
    }
  });
  return names.length ? out : [];
}

// Returns a list of problem lists (one per picture). Any failure just means "no extra pictures".
export async function aiDiagramProblems(text) {
  const t = (text || '').trim();
  if (t.length < 12) return [];
  try {
    const reply = await chat([{ role: 'system', content: SYSTEM }, { role: 'user', content: `TOPICS AND NOTES:\n${t.slice(0, 3000)}` }], { maxTokens: 3500, temperature: 0.4, retries: 0 });
    const data = parseJSON(reply);
    const list = Array.isArray(data) ? data : data.diagrams || [];
    return list.slice(0, 3).map(cleanSpec).filter(Boolean).map(problemsFor).filter((l) => l.length);
  } catch { return []; }
}
