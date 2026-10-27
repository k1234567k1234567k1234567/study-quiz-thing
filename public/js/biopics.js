// More labelled biology pictures for the "what does the arrow point to?" questions: DNA, a bacteriophage,
// an enveloped virus, a bacterium, a flower and a mushroom. Same format as BIO in diagrams.js:
// anchor = where the arrow tip lands (inside the part), from = where the arrow starts (outside the picture).
const stroke = 'stroke="currentColor" stroke-opacity=".6"';

/* ---------- DNA ---------- */
function dna() {
  const ys = [60, 110, 160, 210, 260];
  const pal = [['#e5605a', '#6f9fcf'], ['#7bb36b', '#f2d16b'], ['#6f9fcf', '#e5605a'], ['#f2d16b', '#7bb36b'], ['#e5605a', '#6f9fcf']];
  let s = '';
  s += '<line x1="78" y1="30" x2="78" y2="290" stroke="currentColor" stroke-opacity=".5" stroke-width="3"/><line x1="322" y1="30" x2="322" y2="290" stroke="currentColor" stroke-opacity=".5" stroke-width="3"/>';
  ys.forEach((y, i) => {
    const [l, r] = pal[i];
    s += `<rect x="96" y="${y - 15}" width="88" height="30" rx="5" fill="${l}" fill-opacity=".85" ${stroke} stroke-width="2"/><rect x="216" y="${y - 15}" width="88" height="30" rx="5" fill="${r}" fill-opacity=".85" ${stroke} stroke-width="2"/>`;
    const bonds = i % 2 ? 3 : 2;
    for (let b = 0; b < bonds; b++) s += `<line x1="186" y1="${y - 8 + b * (16 / (bonds - 1))}" x2="214" y2="${y - 8 + b * (16 / (bonds - 1))}" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 3"/>`;
    // sugar (pentagon) beside each base, phosphate (circle) between sugars
    const pent = (cx) => `<polygon points="${cx},${y - 14} ${cx + 13},${y - 5} ${cx + 8},${y + 11} ${cx - 8},${y + 11} ${cx - 13},${y - 5}" fill="#f4a261" fill-opacity=".9" ${stroke} stroke-width="2"/>`;
    s += pent(78) + pent(322);
    if (i < ys.length - 1) { const py = y + 25; s += `<circle cx="78" cy="${py}" r="11" fill="#b9a7e6" fill-opacity=".95" ${stroke} stroke-width="2"/><circle cx="322" cy="${py}" r="11" fill="#b9a7e6" fill-opacity=".95" ${stroke} stroke-width="2"/>`; }
  });
  return s;
}

/* ---------- bacteriophage ---------- */
function phage() {
  let s = '';
  s += `<polygon points="200,18 252,46 252,106 200,134 148,106 148,46" fill="#9fd3e6" fill-opacity=".7" ${stroke} stroke-width="3.5"/>`;
  s += '<path d="M176 56 q12 -12 24 0 t24 0 M176 76 q12 12 24 0 t24 0 M176 96 q12 -12 24 0 t24 0" fill="none" stroke="#6a4fb3" stroke-width="4" stroke-linecap="round"/>';
  s += `<rect x="190" y="134" width="20" height="14" fill="#c7b6f2" ${stroke} stroke-width="2"/>`;
  s += `<rect x="188" y="148" width="24" height="86" rx="4" fill="#f2d16b" fill-opacity=".9" ${stroke} stroke-width="2.5"/>`;
  for (let y = 158; y < 232; y += 12) s += `<line x1="188" y1="${y}" x2="212" y2="${y}" stroke="currentColor" stroke-opacity=".5" stroke-width="2"/>`;
  s += `<polygon points="176,234 224,234 232,252 168,252" fill="#e07a9b" fill-opacity=".9" ${stroke} stroke-width="2.5"/>`;
  s += '<g fill="none" stroke="currentColor" stroke-opacity=".75" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M172 252 L130 276 L112 306"/><path d="M188 252 L170 284 L164 312"/><path d="M212 252 L230 284 L236 312"/><path d="M228 252 L270 276 L288 306"/></g>';
  return s;
}

/* ---------- enveloped virus ---------- */
function virus() {
  let s = '';
  s += `<circle cx="200" cy="160" r="112" fill="#f6c8b8" fill-opacity=".45" stroke="#d9a441" stroke-width="6"/>`;
  const spikes = 14;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const x1 = 200 + Math.cos(a) * 112; const y1 = 160 + Math.sin(a) * 112; const x2 = 200 + Math.cos(a) * 138; const y2 = 160 + Math.sin(a) * 138;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6a4fb3" stroke-width="4.5" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="6" fill="#e5605a" fill-opacity=".95" ${stroke} stroke-width="1.5"/>`;
  }
  s += `<circle cx="200" cy="160" r="76" fill="#9fd3e6" fill-opacity=".55" ${stroke} stroke-width="4"/>`;
  s += '<path d="M150 150 q14 -26 28 0 t28 0 t28 0 M150 176 q14 22 28 0 t28 0 t28 0" fill="none" stroke="#6a4fb3" stroke-width="4.5" stroke-linecap="round"/>';
  return s;
}

/* ---------- bacterium ---------- */
function bacterium() {
  let s = '';
  s += `<rect x="50" y="72" width="268" height="176" rx="88" fill="#9fd3e6" fill-opacity=".28" stroke="currentColor" stroke-opacity=".4" stroke-width="2" stroke-dasharray="5 4"/>`;
  s += '<g stroke="currentColor" stroke-opacity=".8" stroke-width="3" stroke-linecap="round"><line x1="80" y1="130" x2="34" y2="120"/><line x1="76" y1="160" x2="30" y2="160"/><line x1="80" y1="190" x2="36" y2="202"/></g>';
  s += `<rect x="78" y="106" width="212" height="108" rx="54" fill="#f6c8b8" fill-opacity=".4" stroke="#8a6d3b" stroke-width="9"/>`;
  s += `<rect x="98" y="126" width="172" height="68" rx="34" fill="#f6c8b8" fill-opacity=".55" stroke="currentColor" stroke-opacity=".75" stroke-width="3"/>`;
  s += '<path d="M138 150 q10 -16 20 0 t20 0 t20 0 M134 166 q12 14 24 0 t24 0 t18 4" fill="none" stroke="#6a4fb3" stroke-width="4" stroke-linecap="round"/>';
  s += `<circle cx="246" cy="148" r="11" fill="none" stroke="#e07a9b" stroke-width="4"/>`;
  s += '<g fill="#6f9fcf"><circle cx="212" cy="178" r="3.4"/><circle cx="224" cy="184" r="3.4"/><circle cx="236" cy="177" r="3.4"/><circle cx="250" cy="183" r="3.4"/><circle cx="262" cy="176" r="3.4"/></g>';
  s += '<path d="M290 160 C330 120 340 200 380 150" fill="none" stroke="#8a6d3b" stroke-width="5" stroke-linecap="round"/>';
  return s;
}

/* ---------- flower (cut open) ---------- */
function flower() {
  let s = '';
  s += '<rect x="194" y="236" width="12" height="70" fill="#7bb36b" stroke="#2f7d3a" stroke-width="2"/>';
  s += `<ellipse cx="108" cy="170" rx="44" ry="82" transform="rotate(-22 108 170)" fill="#e07a9b" fill-opacity=".8" ${stroke} stroke-width="2.5"/>`;
  s += `<ellipse cx="292" cy="170" rx="44" ry="82" transform="rotate(22 292 170)" fill="#e07a9b" fill-opacity=".8" ${stroke} stroke-width="2.5"/>`;
  s += `<path d="M196 246 C150 236 112 250 92 276 C128 280 172 270 196 252 Z" fill="#5fb85f" fill-opacity=".95" ${stroke} stroke-width="2"/>`;
  s += `<path d="M204 246 C250 236 288 250 308 276 C272 280 228 270 204 252 Z" fill="#5fb85f" fill-opacity=".95" ${stroke} stroke-width="2"/>`;
  s += `<ellipse cx="200" cy="236" rx="22" ry="12" fill="#8a6d3b" fill-opacity=".85" ${stroke} stroke-width="2"/>`;
  s += '<line x1="176" y1="222" x2="150" y2="150" stroke="#8a6d3b" stroke-width="4" stroke-linecap="round"/><line x1="224" y1="222" x2="250" y2="150" stroke="#8a6d3b" stroke-width="4" stroke-linecap="round"/>';
  s += `<ellipse cx="148" cy="138" rx="13" ry="10" fill="#f2d16b" ${stroke} stroke-width="2"/><ellipse cx="252" cy="138" rx="13" ry="10" fill="#f2d16b" ${stroke} stroke-width="2"/>`;
  s += `<ellipse cx="200" cy="206" rx="30" ry="30" fill="#bfe3b0" fill-opacity=".9" ${stroke} stroke-width="2.5"/>`;
  s += `<circle cx="190" cy="206" r="8" fill="#9fd3e6" ${stroke} stroke-width="2"/><circle cx="212" cy="206" r="8" fill="#9fd3e6" ${stroke} stroke-width="2"/>`;
  s += '<rect x="196" y="140" width="8" height="46" fill="#bfe3b0" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>';
  s += `<ellipse cx="200" cy="132" rx="13" ry="9" fill="#e5605a" ${stroke} stroke-width="2"/>`;
  return s;
}

/* ---------- mushroom (with its underground threads) ---------- */
function mushroom() {
  let s = '';
  s += '<line x1="20" y1="228" x2="380" y2="228" stroke="#8a6d3b" stroke-width="2.5" stroke-dasharray="6 5"/>';
  s += '<g fill="none" stroke="#c7b6a0" stroke-width="3" stroke-linecap="round"><path d="M200 250 C160 262 120 258 70 290"/><path d="M200 250 C240 266 290 258 340 292"/><path d="M200 252 C196 280 180 296 160 312"/><path d="M200 252 C210 282 232 298 250 312"/><path d="M150 262 C130 276 110 270 96 252"/><path d="M262 262 C284 276 306 268 322 250"/></g>';
  s += `<path d="M176 130 L170 232 Q200 242 230 232 L224 130 Z" fill="#f4ead8" ${stroke} stroke-width="2.5"/>`;
  s += `<path d="M96 134 C96 56 304 56 304 134 Z" fill="#e5605a" fill-opacity=".9" ${stroke} stroke-width="3"/>`;
  s += '<g fill="#fff" fill-opacity=".85"><circle cx="140" cy="100" r="8"/><circle cx="200" cy="82" r="9"/><circle cx="256" cy="104" r="8"/><circle cx="176" cy="112" r="5"/></g>';
  s += '<path d="M100 136 L300 136 L296 148 Q200 156 104 148 Z" fill="#d9a441" fill-opacity=".85" stroke="currentColor" stroke-opacity=".6" stroke-width="2"/>';
  s += '<g stroke="#8a6d3b" stroke-width="1.6" stroke-opacity=".8">' + [114, 132, 150, 168, 186, 214, 232, 250, 268, 286].map((x) => `<line x1="${x}" y1="138" x2="${x}" y2="150"/>`).join('') + '</g>';
  s += '<g fill="#8a6d3b" fill-opacity=".85"><circle cx="124" cy="170" r="2.8"/><circle cx="108" cy="186" r="2.8"/><circle cx="132" cy="196" r="2.8"/><circle cx="280" cy="172" r="2.8"/><circle cx="296" cy="192" r="2.8"/><circle cx="270" cy="200" r="2.8"/></g>';
  return s;
}

export const BIO2 = {
  dna: {
    title: 'DNA molecule', view: [400, 320], draw: dna,
    parts: {
      'phosphate group': { anchor: [78, 85], from: [14, 40], blurb: 'Links neighbouring sugars together in the backbone of the DNA strand.', words: /phosphate/i },
      'deoxyribose sugar': { anchor: [322, 160], from: [388, 240], blurb: 'A five-carbon sugar that joins the phosphate group to the base.', words: /deoxyribose|\bsugar/i },
      'nitrogenous base': { anchor: [140, 210], from: [140, 304], blurb: 'Carries the genetic code: A, T, G or C.', words: /nitrogenous|\bbases?\b|adenine|thymine|guanine|cytosine/i },
      'hydrogen bond': { anchor: [200, 60], from: [200, 6], blurb: 'Weak bond that holds the two strands together between paired bases.', words: /hydrogen bond/i },
    },
  },
  phage: {
    title: 'bacteriophage (a virus that infects bacteria)', view: [400, 330], draw: phage,
    parts: {
      capsid: { anchor: [226, 36], from: [330, 20], blurb: 'The protein head that protects the virus’s genetic material.', words: /capsid|\bhead\b/i },
      'genetic material': { anchor: [200, 76], from: [352, 90], blurb: 'DNA or RNA inside the capsid; the instructions for making new viruses.', words: /genetic material|\bdna\b|\brna\b|nucleic/i },
      'tail sheath': { anchor: [200, 190], from: [330, 180], blurb: 'Hollow tube that contracts to inject the genetic material into the host.', words: /sheath|\btail\b/i },
      'base plate': { anchor: [200, 243], from: [320, 236], blurb: 'Attaches the virus to the surface of the host cell.', words: /base ?plate/i },
      'tail fibre': { anchor: [258, 269], from: [350, 250], blurb: 'Leg-like fibres that recognise and grip the host cell.', words: /tail fib(re|er)s?|fib(re|er)s?/i },
    },
  },
  virus: {
    title: 'enveloped virus', view: [400, 320], draw: virus,
    parts: {
      envelope: { anchor: [200, 49], from: [90, 20], blurb: 'Outer membrane taken from the host cell that surrounds some viruses.', words: /envelope/i },
      'spike protein': { anchor: [318, 100], from: [384, 40], blurb: 'Protein that binds to receptors so the virus can enter a host cell.', words: /spike|glycoprotein|surface protein/i },
      capsid: { anchor: [200, 98], from: [84, 60], blurb: 'The protein coat that protects the genetic material.', words: /capsid/i },
      'genetic material': { anchor: [178, 150], from: [60, 190], blurb: 'RNA or DNA with the instructions to make more viruses.', words: /genetic material|\brna\b|\bdna\b|nucleic/i },
    },
  },
  bacterium: {
    title: 'bacterial cell', view: [420, 320], draw: bacterium,
    parts: {
      capsule: { anchor: [184, 88], from: [120, 20], blurb: 'Sticky outer layer that protects the cell and helps it stick to surfaces.', words: /capsule|slime/i },
      'cell wall': { anchor: [184, 214], from: [90, 300], blurb: 'Rigid layer that gives the cell its shape and protects it.', words: /cell wall/i },
      'cell membrane': { anchor: [184, 126], from: [250, 20], blurb: 'Controls what enters and leaves the cell.', words: /cell membrane|plasma membrane/i },
      nucleoid: { anchor: [160, 162], from: [150, 258], blurb: 'Region of the cytoplasm that holds the main loop of DNA (there is no nucleus).', words: /nucleoid|circular dna|chromosome/i },
      plasmid: { anchor: [246, 148], from: [330, 70], blurb: 'Small extra ring of DNA, often carrying genes such as antibiotic resistance.', words: /plasmid/i },
      ribosome: { anchor: [236, 177], from: [320, 260], blurb: 'Builds proteins from amino acids.', words: /ribosom/i },
      flagellum: { anchor: [335, 159], from: [390, 70], blurb: 'Whip-like tail that spins to move the cell.', words: /flagell/i },
      pilus: { anchor: [54, 160], from: [30, 230], blurb: 'Short hair-like projection used to attach to surfaces and to other cells.', words: /pili|pilus|fimbria/i },
      cytoplasm: { anchor: [112, 160], from: [30, 90], blurb: 'Jelly-like fluid inside the cell where reactions take place.', words: /cytoplasm/i },
    },
  },
  flower: {
    title: 'flower (cut in half)', view: [400, 320], draw: flower,
    parts: {
      petal: { anchor: [92, 170], from: [20, 100], blurb: 'Brightly coloured part that attracts pollinators.', words: /petal/i },
      sepal: { anchor: [128, 262], from: [40, 304], blurb: 'Green leaf-like part that protects the flower bud.', words: /sepal/i },
      anther: { anchor: [148, 138], from: [70, 60], blurb: 'Top of the stamen; produces pollen.', words: /anther/i },
      filament: { anchor: [162, 186], from: [100, 230], blurb: 'Thin stalk that holds the anther up.', words: /filament/i },
      stigma: { anchor: [200, 132], from: [270, 60], blurb: 'Sticky top of the pistil that catches pollen.', words: /stigma/i },
      style: { anchor: [200, 164], from: [330, 196], blurb: 'Tube that holds up the stigma; the pollen tube grows down it.', words: /\bstyle\b/i },
      ovary: { anchor: [200, 222], from: [320, 230], blurb: 'Holds the ovules; it becomes the fruit after fertilization.', words: /ovary/i },
      ovule: { anchor: [190, 206], from: [286, 270], blurb: 'Contains the egg cell; it becomes the seed after fertilization.', words: /ovule/i },
      receptacle: { anchor: [200, 236], from: [260, 300], blurb: 'The base of the flower that holds all the parts.', words: /receptacle/i },
    },
  },
  mushroom: {
    title: 'mushroom (a fungus)', view: [400, 320], draw: mushroom,
    parts: {
      cap: { anchor: [200, 62], from: [330, 20], blurb: 'The umbrella-shaped top that holds the gills.', words: /\bcap\b|pileus/i },
      gills: { anchor: [200, 140], from: [352, 120], blurb: 'Thin ridges under the cap where spores are made.', words: /gills?/i },
      stalk: { anchor: [200, 190], from: [320, 200], blurb: 'The stem that lifts the cap into the air.', words: /stalk|stipe|stem/i },
      mycelium: { anchor: [200, 256], from: [330, 300], blurb: 'The underground network of thread-like hyphae that absorbs nutrients.', words: /mycel|hyph/i },
      spores: { anchor: [124, 170], from: [40, 190], blurb: 'Tiny reproductive cells released to grow into new fungi.', words: /spores?/i },
    },
  },
};
