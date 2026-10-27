// Biology diagram questions that are not "name the part the arrow points to": stages of mitosis and
// meiosis, the cell cycle, Punnett squares, pedigrees, karyotypes and the levels of classification.
// Answers are computed from the same genotypes / counts that draw each picture.
import { pick, shuffle, rnd, withWrong, cap } from './dutil.js';
import { TAXA, PLANT_GROUPS } from './diagrams2.js';

const D = (o) => ({ kind: 'graph', ...o });
const pct = (n, d) => { const f = `${n / d === 1 ? '1' : n === 0 ? '0' : `${n}/${d}`}`; const g = (a, b) => (b ? g(b, a % b) : a); const k = g(n, d) || 1; return n === 0 ? '0 (0%)' : `${n / k === d / k ? '1' : `${n / k}/${d / k}`} (${Math.round((n / d) * 100)}%)`.replace(f, `${n / k}/${d / k}`); };
const frac = (n, d) => { const g = (a, b) => (b ? g(b, a % b) : a); const k = g(n, d) || 1; const a = n / k; const b = d / k; return n === 0 ? '0 (0%)' : b === 1 ? '1 (100%)' : `${a}/${b} (${Math.round((n / d) * 100)}%)`; };
void pct;

/* ================= mitosis, the cell cycle and meiosis ================= */

const MITOSIS = {
  interphase: 'Interphase: the cell grows and copies its DNA. The nucleus is still intact and the chromosomes are loose, thin chromatin.',
  prophase: 'Prophase: the chromosomes coil up and become visible as X shapes, the nuclear envelope starts to break down and spindle fibres begin to form.',
  metaphase: 'Metaphase: the chromosomes line up along the middle (equator) of the cell, attached to spindle fibres.',
  anaphase: 'Anaphase: the sister chromatids are pulled apart to opposite ends of the cell.',
  telophase: 'Telophase: two new nuclei form at the ends of the cell and the cell pinches in two (cytokinesis).',
};
const NAMES = { interphase: 'Interphase', prophase: 'Prophase', metaphase: 'Metaphase', anaphase: 'Anaphase', telophase: 'Telophase' };

export function mitosisProblems() {
  const out = []; const topic = 'Cell division';
  const stage = pick(Object.keys(MITOSIS));
  const others = Object.keys(MITOSIS).filter((s) => s !== stage);
  const truth = Math.random() < 0.5; const shown = truth ? stage : pick(others);
  out.push(D({
    topic, diagram: { kind: 'mitosis', stage }, prompt: 'Which stage of the cell cycle is shown?', answer: NAMES[stage],
    wrong: shuffle(others).slice(0, 3).map((s) => NAMES[s]), explain: MITOSIS[stage],
    tf: { q: `The cell shown is in ${NAMES[shown].toLowerCase()}.`, answer: truth },
  }));
  const ci = rnd(0, 3);
  const CY = [['G1', 'G1 (growth)', 'The cell grows and does its normal job.'], ['S', 'S (DNA synthesis)', 'The cell copies (replicates) its DNA, so every chromosome has two sister chromatids.'], ['G2', 'G2 (preparation)', 'The cell makes the proteins and organelles it needs and checks the copied DNA.'], ['M', 'M (mitosis)', 'The cell divides: mitosis then cytokinesis.']];
  out.push(D({
    topic, diagram: { kind: 'cycle', hide: ci }, prompt: 'Which phase of the cell cycle is the shaded part of the ring (marked "?")?', answer: CY[ci][1],
    wrong: CY.filter((_, i) => i !== ci).map((c) => c[1]), explain: `${CY[ci][2]} The cycle runs G1, S, G2, then M.`,
  }));
  return out;
}

const MEI = {
  prophase1: ['Prophase I', 'Homologous chromosomes pair up and swap pieces (crossing over). Each chromosome is still made of two chromatids.'],
  metaphase1: ['Metaphase I', 'Homologous pairs line up together along the middle, one homologue on each side.'],
  anaphase1: ['Anaphase I', 'Whole homologous chromosomes (each still two chromatids) are pulled to opposite ends. The chromatids do not separate yet.'],
  metaphase2: ['Metaphase II', 'There are now two cells, each with half the chromosomes, lined up along the middle.'],
  anaphase2: ['Anaphase II', 'The sister chromatids finally split and move to opposite ends of each of the two cells.'],
  gametes: ['Four haploid cells (gametes)', 'Meiosis ends with four cells, each with half the original number of chromosomes and single chromatids.'],
};

export function meiosisProblems() {
  const out = []; const topic = 'Meiosis';
  const stage = pick(Object.keys(MEI));
  const others = Object.keys(MEI).filter((s) => s !== stage);
  out.push(D({
    topic, diagram: { kind: 'meiosis', stage }, prompt: 'Which stage of meiosis is shown?', answer: MEI[stage][0],
    wrong: shuffle(others).slice(0, 3).map((s) => MEI[s][0]), explain: MEI[stage][1],
  }));
  const n = rnd(2, 4);
  const diagram = { kind: 'homologs', pairs: n };
  out.push(D({
    topic, diagram, prompt: 'How many chromosomes does this cell have?', answer: String(2 * n),
    wrong: withWrong(String(2 * n), [String(n), String(4 * n), String(2 * n + 1), String(n + 1)], (i) => String(2 * n + i + 1)),
    explain: `There are ${n} pairs of homologous chromosomes, so ${2 * n} chromosomes in total (2n = ${2 * n}).`,
  }));
  out.push(D({
    topic, diagram, prompt: 'After meiosis, how many chromosomes will each gamete (sex cell) have?', answer: String(n),
    wrong: withWrong(String(n), [String(2 * n), String(4 * n), String(n + 1), String(n - 1 || 1)], (i) => String(n + i + 2)),
    explain: `Meiosis halves the chromosome number. The cell has 2n = ${2 * n}, so each gamete has n = ${n}.`,
    fill: { q: 'Each gamete has _____ chromosomes', answer: String(n) },
  }));
  return out;
}

/* ================= Punnett squares ================= */

const TRAITS = [['T', 'tall', 'short'], ['R', 'round seeds', 'wrinkled seeds'], ['Y', 'yellow seeds', 'green seeds'], ['P', 'purple flowers', 'white flowers'], ['B', 'brown fur', 'white fur'], ['W', 'widow’s peak', 'straight hairline']];
const sortG = (a, b) => (a === b ? a + b : a < b ? a + b : b + a); // uppercase sorts before lowercase
const geno = (a, b) => (a === a.toUpperCase() && b !== b.toUpperCase() ? a + b : a !== a.toUpperCase() && b === b.toUpperCase() ? b + a : a + b);
void sortG;

export function punnettProblems() {
  const [L, dom, rec] = pick(TRAITS); const l = L.toLowerCase();
  const [p1, p2] = pick([[L + l, L + l], [L + l, l + l], [L + L, l + l], [L + L, L + l], [L + l, L + l]]);
  const top = p1.split(''); const left = p2.split('');
  const cells = left.map((a) => top.map((b) => geno(a, b)));
  const flat = cells.flat();
  const diagramBase = { kind: 'punnett', top, left, cells };
  const out = []; const topic = 'Punnett squares';
  const hr = rnd(0, 1); const hc = rnd(0, 1);
  const hidden = cells[hr][hc];
  const gAns = hidden;
  out.push(D({
    topic, diagram: { ...diagramBase, hide: [hr, hc] }, prompt: `The Punnett square shows a cross between ${p1} and ${p2}. What genotype goes in the box marked "?"`, answer: gAns,
    wrong: withWrong(gAns, [L + L, L + l, l + l].filter((g) => g !== gAns), () => 'It cannot be worked out from the square'),
    explain: `Combine the allele at the top of the column (${top[hc]}) with the allele at the side of the row (${left[hr]}): ${gAns}.`,
  }));
  const nDom = flat.filter((g) => g.includes(L)).length;
  const domAns = frac(nDom, flat.length);
  const fracs = [frac(0, 4), frac(1, 4), frac(1, 2), frac(3, 4), frac(4, 4)];
  out.push(D({
    topic, diagram: diagramBase, prompt: `What fraction of the offspring will show the dominant trait (${dom})? (${L} = ${dom}, ${l} = ${rec})`, answer: domAns,
    wrong: withWrong(domAns, fracs.filter((f) => f !== domAns), () => '1/8 (13%)'),
    explain: `Count the boxes that contain at least one ${L}: ${nDom} out of ${flat.length}, so ${domAns}.`,
  }));
  const nRec = flat.filter((g) => g === l + l).length;
  const recAns = frac(nRec, flat.length);
  out.push(D({
    topic, diagram: diagramBase, prompt: `What is the probability that an offspring shows the recessive trait (${rec})?`, answer: recAns,
    wrong: withWrong(recAns, fracs.filter((f) => f !== recAns), () => '1/8 (13%)'),
    explain: `Only ${l}${l} shows the recessive trait. ${nRec} of the ${flat.length} boxes are ${l}${l}, so ${recAns}.`,
  }));
  return out;
}

export function dihybridProblems() {
  const [A, a1] = ['R', 'r']; const [B, b1] = ['Y', 'y'];
  const test = Math.random() < 0.3;
  const g1 = [A + B, A + b1, a1 + B, a1 + b1];
  const g2 = test ? [a1 + b1] : g1;
  const cells = g2.map((g) => g1.map((h) => [A, B].map((up, i) => { const x = h[i]; const y = g[i]; return x === x.toUpperCase() ? x + y : y === y.toUpperCase() ? y + x : x + y; }).join('')));
  const fix = (s) => { const f = (u, v) => (u === u.toUpperCase() ? u + v : v === v.toUpperCase() ? v + u : u + v); return f(s[0], s[1]) + f(s[2], s[3]); };
  void fix;
  const flat = cells.flat(); const total = flat.length;
  const diagram = { kind: 'punnett', top: g1, left: g2, cells };
  const out = []; const topic = 'Dihybrid crosses';
  const parents = test ? 'RrYy × rryy (a test cross)' : 'RrYy × RrYy';
  const both = flat.filter((g) => g.includes('R') && g.includes('Y')).length;
  const rr = flat.filter((g) => g.includes('rr') && g.includes('yy')).length;
  out.push(D({
    topic, diagram, prompt: `Round (R) and yellow (Y) are dominant over wrinkled (r) and green (y). The cross is ${parents}. How many of the ${total} boxes are round AND yellow (both dominant traits)?`, answer: String(both),
    wrong: withWrong(String(both), [String(3), String(1), String(total), String(9), String(4), String(6)], (i) => String(both + i + 1)),
    explain: `Count the boxes that have at least one R and at least one Y: ${both} out of ${total}. For RrYy × RrYy this is the famous 9:3:3:1 ratio.`,
  }));
  const rrAns = frac(rr, total);
  out.push(D({
    topic, diagram, prompt: `What is the probability of an offspring that is wrinkled and green (rryy)?`, answer: rrAns,
    wrong: withWrong(rrAns, [frac(1, 16), frac(1, 4), frac(9, 16), frac(3, 16), frac(1, 2)].filter((f) => f !== rrAns), () => '1/8 (13%)'),
    explain: `Only boxes with rryy count: ${rr} of ${total}, so ${rrAns}.`,
  }));
  const r0 = rnd(0, g2.length - 1); const c0 = rnd(0, 3); const hid = cells[r0][c0];
  out.push(D({
    topic, diagram: { ...diagram, hide: [r0, c0] }, prompt: 'What genotype goes in the box marked "?"', answer: hid,
    wrong: withWrong(hid, shuffle([...new Set(flat)].filter((g) => g !== hid)), (i) => ['RRYY', 'rryy', 'RRyy', 'rrYY', 'RrYY', 'RRYy'][i % 6]),
    explain: `Combine the gametes ${g1[c0]} (top) and ${g2[r0]} (side): ${hid}.`,
  }));
  return out;
}

const SUP = { A: 'ᴬ', B: 'ᴮ' };
const BLOOD = { 'IᴬIᴬ': 'A', 'Iᴬi': 'A', 'IᴮIᴮ': 'B', 'Iᴮi': 'B', 'IᴬIᴮ': 'AB', ii: 'O' };
const IA = `I${SUP.A}`; const IB = `I${SUP.B}`;
const bl = (a, b) => { const set = [a, b].sort((x, y) => (x === 'i' ? 1 : y === 'i' ? -1 : x < y ? -1 : 1)); return set.join(''); };

export function incompleteProblems() {
  const mode = pick(['incomplete', 'codominant', 'blood']);
  const out = []; const topic = mode === 'blood' ? 'Blood types' : mode === 'incomplete' ? 'Incomplete dominance' : 'Codominance';
  if (mode === 'blood') {
    const combos = [[IA + 'i', IB + 'i'], [IA + 'i', IA + 'i'], [IA + IB, 'ii'], [IA + 'i', IA + IB], [IB + 'i', IB + 'i']];
    const [p1, p2] = pick(combos);
    const al = (g) => (g === 'ii' ? ['i', 'i'] : g.endsWith('i') ? [g.slice(0, 2), 'i'] : [g.slice(0, 2), g.slice(2)]);
    const top = al(p1); const left = al(p2);
    const cells = left.map((a) => top.map((b) => bl(a, b)));
    const flat = cells.flat();
    const ph = (g) => BLOOD[g] || (g === 'ii' ? 'O' : '?');
    const diagram = { kind: 'punnett', top, left, cells };
    const r0 = rnd(0, 1); const c0 = rnd(0, 1); const hid = cells[r0][c0];
    out.push(D({
      topic, diagram: { ...diagram, hide: [r0, c0] }, prompt: `A parent with genotype ${p1} has children with a parent with genotype ${p2}. What blood type does the child in the box marked "?" have?`, answer: `Type ${ph(hid)}`,
      wrong: ['A', 'B', 'AB', 'O'].filter((t) => t !== ph(hid)).map((t) => `Type ${t}`),
      explain: `Combine ${top[c0]} and ${left[r0]} to get ${hid}. ${IA} and ${IB} are codominant and both show; i is recessive. So the blood type is ${ph(hid)}.`,
    }));
    const possible = [...new Set(flat.map(ph))].sort();
    const ans = possible.map((t) => `Type ${t}`).join(', ');
    const alts = [['A', 'B', 'AB', 'O'], ['A', 'O'], ['A', 'B'], ['AB', 'O'], ['A', 'AB'], ['B', 'O']].map((l) => l.sort().map((t) => `Type ${t}`).join(', ')).filter((s) => s !== ans);
    out.push(D({
      topic, diagram, prompt: `Which blood types are possible for the children of ${p1} and ${p2}?`, answer: ans, wrong: withWrong(ans, shuffle(alts), () => 'Type O only'),
      explain: `The boxes show ${flat.join(', ')}, which give blood types ${possible.join(', ')}.`,
    }));
    return out;
  }
  const [L, c1, c2, l2] = pick([['R', 'red', 'white', 'W'], ['B', 'black', 'white', 'W'], ['Y', 'yellow', 'blue', 'B']]);
  const mid = mode === 'incomplete' ? (L === 'R' ? 'pink' : L === 'B' ? 'grey' : 'green') : `${c1} and ${c2} patches (both show)`;
    const parents = pick([['RW', 'RW'], ['RR', 'WW'], ['RW', 'WW'], ['RR', 'RW']]).map((g) => g.replace(/R/g, '\u0001').replace(/W/g, l2).replace(/\u0001/g, L));
  const top = parents[0].split(''); const left = parents[1].split('');
  const cells = left.map((a) => top.map((b) => (a === b ? a + b : L + l2)));
  const flat = cells.flat();
  const ph = (g) => (g === L + L ? c1 : g === l2 + l2 ? c2 : mid);
  const legend = mode === 'incomplete' ? `${L}${L} = ${c1}, ${l2}${l2} = ${c2}, ${L}${l2} = ${mid}` : `${L}${L} = ${c1}, ${l2}${l2} = ${c2}, ${L}${l2} = ${mid}`;
  const diagram = { kind: 'punnett', top, left, cells };
  const r0 = rnd(0, 1); const c0 = rnd(0, 1); const hid = cells[r0][c0];
  out.push(D({
    topic, diagram: { ...diagram, hide: [r0, c0] }, prompt: `This trait shows ${mode === 'incomplete' ? 'incomplete dominance' : 'codominance'} (${legend}). What is the phenotype of the offspring in the box marked "?"`, answer: cap(ph(hid)),
    wrong: withWrong(cap(ph(hid)), [c1, c2, mid, mode === 'incomplete' ? `${c1} or ${c2} (dominant wins)` : 'Neither colour'].map(cap).filter((x) => x !== cap(ph(hid))), () => 'Black'),
    explain: `The genotype in that box is ${hid}. ${hid === L + l2 ? (mode === 'incomplete' ? 'The heterozygote is a blend of the two colours.' : 'Both alleles show at the same time.') : 'It is homozygous, so it shows that allele’s colour.'}`,
  }));
  const nMid = flat.filter((g) => g === L + l2).length;
  const ans = frac(nMid, 4);
  out.push(D({
    topic, diagram, prompt: `What fraction of the offspring will be ${mode === 'incomplete' ? mid : 'the mixed (heterozygous) type'}?`, answer: ans,
    wrong: withWrong(ans, [frac(0, 4), frac(1, 4), frac(1, 2), frac(3, 4), frac(4, 4)].filter((f) => f !== ans), () => '1/8 (13%)'),
    explain: `Count the ${L}${l2} boxes: ${nMid} of 4, so ${ans}.`,
  }));
  return out;
}

const XH = 'Xᴮ'; const Xh = 'Xᵇ';
export function sexLinkedProblems() {
  const mom = pick([[XH, Xh], [XH, Xh], [Xh, Xh], [XH, XH]]); const dad = pick([[XH, 'Y'], [Xh, 'Y']]);
  const top = mom; const left = dad;
  const cell = (a, b) => (a === 'Y' ? b + 'Y' : b === 'Y' ? a + 'Y' : [a, b].sort().join(''));
  const cells = left.map((a) => top.map((b) => cell(a, b)));
  const flat = cells.flat();
  const descr = (g) => (g.endsWith('Y') ? (g.startsWith(Xh) ? 'colour-blind male' : 'normal male') : g === Xh + Xh ? 'colour-blind female' : g === XH + XH ? 'normal female' : 'carrier female (normal vision)');
  const out = []; const topic = 'Sex-linked traits';
  const diagram = { kind: 'punnett', top, left, cells };
  const momG = mom.join(''); const dadG = dad.join('');
  const r0 = rnd(0, 1); const c0 = rnd(0, 1); const hid = cells[r0][c0];
  const opts = ['colour-blind male', 'normal male', 'colour-blind female', 'normal female', 'carrier female (normal vision)'];
  out.push(D({
    topic, diagram: { ...diagram, hide: [r0, c0] }, prompt: `Colour blindness is X-linked recessive (${XH} = normal, ${Xh} = colour-blind). The cross is mother ${momG} × father ${dadG}. What is the child in the box marked "?"`, answer: cap(descr(hid)),
    wrong: withWrong(cap(descr(hid)), shuffle(opts.filter((o) => o !== descr(hid))).map(cap), () => 'Normal male'),
    explain: `The box is ${hid}. ${hid.endsWith('Y') ? 'A male has only one X, so he shows whatever allele it carries.' : hid === Xh + Xh ? 'Two recessive alleles: a colour-blind female.' : hid === XH + XH ? 'Two normal alleles.' : 'One normal and one recessive allele: she has normal vision and is a carrier.'}`,
  }));
  const aff = flat.filter((g) => descr(g).startsWith('colour-blind')).length;
  const affAns = frac(aff, 4);
  out.push(D({
    topic, diagram, prompt: 'What fraction of all the children will be colour-blind?', answer: affAns,
    wrong: withWrong(affAns, [frac(0, 4), frac(1, 4), frac(1, 2), frac(3, 4), frac(4, 4)].filter((f) => f !== affAns), () => '1/8 (13%)'),
    explain: `Count the boxes with ${Xh} and no ${XH}, or ${Xh}Y: ${aff} of 4, so ${affAns}.`,
  }));
  return out;
}

/* ================= pedigrees ================= */

export function pedigreeProblems() {
  const recessive = Math.random() < 0.6; const topic = 'Pedigrees';
  const nk = rnd(3, 5);
  const kids = Array.from({ length: nk }, () => ({ sex: pick(['M', 'F']), g: pick(['AA', 'Aa', 'Aa', 'aa']) }));
  const needAffected = recessive; // recessive: want an aa child (affected); dominant: want an aa child (unaffected)
  if (!kids.some((k) => k.g === 'aa')) kids[rnd(0, nk - 1)].g = 'aa';
  const affected = (g) => (recessive ? g === 'aa' : g !== 'aa');
  void needAffected;
  const parents = [{ sex: 'M', affected: !recessive }, { sex: 'F', affected: !recessive }];
  const markIdx = kids.findIndex((k) => k.g === 'aa');
  const diagram = { kind: 'pedigree', parents, kids: kids.map((k) => ({ sex: k.sex, affected: affected(k.g) })), mark: markIdx };
  const out = [];
  const mode = recessive ? 'Recessive' : 'Dominant';
  out.push(D({
    topic, diagram, prompt: recessive ? 'Two unaffected parents have a child with the trait (shaded). Is the trait dominant or recessive?' : 'Two parents who both show the trait (shaded) have a child who does not. Is the trait dominant or recessive?', answer: mode,
    wrong: [recessive ? 'Dominant' : 'Recessive', 'Sex-linked only', 'It cannot be determined'],
    explain: recessive ? 'A trait that skips a generation (appears in a child but neither parent) is recessive: both parents hid a recessive allele.' : 'If two affected parents have an unaffected child, the trait must be dominant: the parents each carry a recessive allele that is masked.',
  }));
  const pg = recessive ? 'Both parents are carriers (Aa)' : 'Both parents are heterozygous (Aa)';
  out.push(D({
    topic, diagram, prompt: 'What are the genotypes of the parents? (A = dominant allele, a = recessive allele)', answer: pg,
    wrong: recessive ? ['Both parents are AA', 'Both parents are aa', 'One parent is AA and one is aa'] : ['Both parents are AA', 'Both parents are aa', 'One parent is Aa and one is aa'],
    explain: 'Each parent must be able to pass on an a allele to the child with genotype aa, so both are Aa.',
  }));
  const ma = pick(kids.filter((k) => k.g === 'aa'));
  void ma;
  out.push(D({
    topic, diagram, prompt: `What is the genotype of the child the arrow points to? (${recessive ? 'The child shows the trait.' : 'The child does not show the trait.'})`, answer: 'aa',
    wrong: ['AA', 'Aa', 'Cannot tell'],
    explain: recessive ? 'A child who shows a recessive trait must have two recessive alleles: aa.' : 'A child who does not show a dominant trait must have two recessive alleles: aa.',
  }));
  const p = frac(1, 4);
  out.push(D({
    topic, diagram, prompt: `If these parents have another child, what is the probability that the child will be ${recessive ? 'affected' : 'unaffected'} (genotype aa)?`, answer: p,
    wrong: [frac(1, 2), frac(3, 4), frac(0, 4), frac(1, 8)].filter((x) => x !== p).slice(0, 3),
    explain: 'Both parents are Aa. A Punnett square for Aa × Aa gives 1 AA : 2 Aa : 1 aa, so the chance of aa is 1/4.',
  }));
  return out;
}

/* ================= karyotypes ================= */

const KARYO = [
  { label: 'Normal female', counts: Array(22).fill(2), sex: ['X', 'X'], total: 46, sexTxt: 'female', cond: 'No disorder (normal karyotype)' },
  { label: 'Normal male', counts: Array(22).fill(2), sex: ['X', 'Y'], total: 46, sexTxt: 'male', cond: 'No disorder (normal karyotype)' },
  { label: 'Down syndrome', counts: Array.from({ length: 22 }, (_, i) => (i === 20 ? 3 : 2)), sex: ['X', 'X'], total: 47, sexTxt: 'female', cond: 'Down syndrome (trisomy 21)', extra: '21' },
  { label: 'Down syndrome (male)', counts: Array.from({ length: 22 }, (_, i) => (i === 20 ? 3 : 2)), sex: ['X', 'Y'], total: 47, sexTxt: 'male', cond: 'Down syndrome (trisomy 21)', extra: '21' },
  { label: 'Turner syndrome', counts: Array(22).fill(2), sex: ['X'], total: 45, sexTxt: 'female', cond: 'Turner syndrome (only one X)' },
  { label: 'Klinefelter syndrome', counts: Array(22).fill(2), sex: ['X', 'X', 'Y'], total: 47, sexTxt: 'male', cond: 'Klinefelter syndrome (XXY)' },
];

export function karyotypeProblems() {
  const k = pick(KARYO); const topic = 'Karyotypes';
  const diagram = { kind: 'karyo', counts: k.counts, sex: k.sex };
  const out = [];
  out.push(D({
    topic, diagram, prompt: 'How many chromosomes does this karyotype show in total?', answer: String(k.total),
    wrong: withWrong(String(k.total), [String(46), String(45), String(47), String(23), String(44)].filter((x) => x !== String(k.total)), (i) => String(48 + i)),
    explain: `Count the chromosomes in each numbered group and the sex chromosomes: ${k.total} in total (a normal human cell has 46).`,
    fill: { q: 'The total number of chromosomes is _____', answer: String(k.total) },
  }));
  const conds = ['No disorder (normal karyotype)', 'Down syndrome (trisomy 21)', 'Turner syndrome (only one X)', 'Klinefelter syndrome (XXY)'];
  out.push(D({
    topic, diagram, prompt: 'What does this karyotype show?', answer: k.cond, wrong: conds.filter((c) => c !== k.cond),
    explain: k.extra ? 'Chromosome 21 has three copies instead of two (trisomy 21), which causes Down syndrome. It was caused by nondisjunction.' : k.sex.length === 1 ? 'Only one sex chromosome (X) is present: 45 chromosomes in total, Turner syndrome.' : k.sex.length === 3 ? 'The sex chromosomes are XXY: 47 chromosomes, Klinefelter syndrome.' : 'There are 46 chromosomes, two of each numbered chromosome, and the sex chromosomes are normal.',
  }));
  out.push(D({
    topic, diagram, prompt: 'Is this person male or female?', answer: cap(k.sexTxt), wrong: [cap(k.sexTxt === 'male' ? 'female' : 'male'), 'Cannot be determined', 'Both'],
    explain: `The sex chromosomes are ${k.sex.join('')}. ${k.sex.includes('Y') ? 'A Y chromosome means male.' : 'No Y chromosome means female.'}`,
    tf: { q: `The person with this karyotype is ${k.sexTxt}.`, answer: true },
  }));
  return out;
}

/* ================= taxonomy ================= */

export function taxonomyProblems() {
  const i = rnd(0, TAXA.length - 1); const topic = 'Classification';
  const diagram = { kind: 'taxon', hide: i };
  const out = [];
  out.push(D({
    topic, diagram, prompt: 'Which level of classification is marked "?"', answer: TAXA[i], wrong: shuffle(TAXA.filter((t) => t !== TAXA[i])).slice(0, 3),
    explain: `From broadest to most specific the levels are ${TAXA.join(', ')}. The marked box is level ${i + 1}: ${TAXA[i]}. (Dear King Philip Came Over For Good Soup.)`,
  }));
  const j = rnd(1, TAXA.length - 1);
  out.push(D({
    topic, diagram: { kind: 'taxon', hide: null }, prompt: `Which level is the next broader group above ${TAXA[j].toLowerCase()}?`, answer: TAXA[j - 1],
    wrong: shuffle(TAXA.filter((t) => t !== TAXA[j - 1] && t !== TAXA[j])).slice(0, 3),
    explain: `${TAXA[j - 1]} sits directly above ${TAXA[j]} in the hierarchy.`,
  }));
  return out;
}


/* ================= plant groups, leaves, symmetry, bacteria shapes ================= */

const PLANT_INFO = [
  'Bryophytes (mosses) have no vascular tissue, so they stay small and low, and they reproduce by spores.',
  'Seedless vascular plants (ferns) have xylem and phloem so they can grow tall, but they still reproduce by spores.',
  'Gymnosperms (conifers) make seeds that sit "naked" on cone scales, not inside a fruit.',
  'Angiosperms (flowering plants) make seeds inside a fruit that develops from a flower’s ovary.',
];
export function plantGroupProblems() {
  const topic = 'Plant groups'; const out = [];
  const i = rnd(0, 3);
  const examples = ['mosses, liverworts', 'ferns', 'pine, spruce, cedar', 'roses, maples, grasses'];
  out.push(D({
    topic, diagram: { kind: 'plantkey', hide: i }, prompt: 'Which group of plants is marked "?" in this key?', answer: PLANT_GROUPS[i],
    wrong: PLANT_GROUPS.filter((g) => g !== PLANT_GROUPS[i]), explain: `${PLANT_INFO[i]} Examples: ${examples[i]}.`,
  }));
  const type = pick(['monocot', 'dicot']);
  out.push(D({
    topic: 'Monocots and dicots', diagram: { kind: 'leaf', type }, prompt: 'Is this leaf from a monocot or a dicot?', answer: type === 'monocot' ? 'Monocot' : 'Dicot',
    wrong: [type === 'monocot' ? 'Dicot' : 'Monocot', 'Gymnosperm (conifer)', 'Bryophyte (moss)'],
    explain: type === 'monocot' ? 'Parallel veins mean a monocot (one cotyledon), for example corn, grass and onions.' : 'Branching (net) veins mean a dicot (two cotyledons), for example maple, bean and dandelion.',
    tf: { q: `The leaf shown has ${type === 'monocot' ? 'parallel' : 'branching'} veins.`, answer: true },
  }));
  out.push(D({
    topic: 'Monocots and dicots', diagram: { kind: 'leaf', type }, prompt: 'How many cotyledons does the seed of this plant have?', answer: type === 'monocot' ? 'One' : 'Two',
    wrong: [type === 'monocot' ? 'Two' : 'One', 'None', 'Three'],
    explain: type === 'monocot' ? 'Monocot = one cotyledon, with parallel leaf veins.' : 'Dicot = two cotyledons, with branching leaf veins.',
  }));
  return out;
}

export function symmetryProblems() {
  const types = { asymmetrical: ['Asymmetrical', 'A sponge has no plane of symmetry: no way to cut it into two matching halves.'], radial: ['Radial symmetry', 'Radially symmetrical animals (sea stars, jellyfish) can be cut into matching halves along any plane through the central axis.'], bilateral: ['Bilateral symmetry', 'Bilaterally symmetrical animals (most animals, including humans) have two matching halves, left and right, divided by one plane.'], spherical: ['Spherical symmetry', 'A sphere looks the same from every direction.'] };
  const t = pick(['asymmetrical', 'radial', 'bilateral']);
  return [D({
    topic: 'Animal body plans', diagram: { kind: 'symmetry', type: t }, prompt: 'What type of body symmetry does this animal show?', answer: types[t][0],
    wrong: Object.keys(types).filter((k) => k !== t).map((k) => types[k][0]), explain: types[t][1],
  })];
}

export function bacteriaShapeProblems() {
  const shapes = { coccus: ['Coccus (round)', 'Cocci are spheres.'], bacillus: ['Bacillus (rod)', 'Bacilli are rod-shaped.'], spirillum: ['Spirillum (spiral)', 'Spirilla are spiral or corkscrew shaped.'] };
  const topic = 'Bacteria shapes'; const out = [];
  const sh = pick(Object.keys(shapes));
  const ar = sh === 'spirillum' ? 'single' : pick(['single', 'single', 'pairs', 'chain', 'cluster']);
  out.push(D({
    topic, diagram: { kind: 'bactshape', shape: sh, arrange: ar }, prompt: 'What is the shape of these bacteria?', answer: shapes[sh][0],
    wrong: [...Object.keys(shapes).filter((k) => k !== sh).map((k) => shapes[k][0]), 'Vibrio (comma-shaped)'].slice(0, 3), explain: shapes[sh][1],
  }));
  if (sh !== 'spirillum' && ar !== 'single') {
    const NAMEP = { pairs: 'Diplo-', chain: 'Strepto-', cluster: 'Staphylo-' };
    const ans = `${NAMEP[ar]} (${ar === 'pairs' ? 'pairs' : ar === 'chain' ? 'chains' : 'clusters'})`;
    out.push(D({
      topic, diagram: { kind: 'bactshape', shape: sh, arrange: ar }, prompt: 'Which prefix describes how these cells are arranged?', answer: ans,
      wrong: Object.keys(NAMEP).filter((k) => k !== ar).map((k) => `${NAMEP[k]} (${k === 'pairs' ? 'pairs' : k === 'chain' ? 'chains' : 'clusters'})`).concat(['Spiro- (spirals)']).slice(0, 3),
      explain: 'Diplo- means pairs, strepto- means chains and staphylo- means clusters (like a bunch of grapes).',
    }));
  }
  return out;
}

export const BIOGEN = {
  mitosis: mitosisProblems, meiosis: meiosisProblems, punnett: punnettProblems, dihybrid: dihybridProblems, incomplete: incompleteProblems,
  sexlinked: sexLinkedProblems, pedigree: pedigreeProblems, karyotype: karyotypeProblems, taxonomy: taxonomyProblems,
  plantgroups: plantGroupProblems, symmetry: symmetryProblems, bactshape: bacteriaShapeProblems,
};
