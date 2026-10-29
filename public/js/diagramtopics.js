// Decides which pictures a student's notes call for, and holds every picture question maker.
// detectExtra(text) returns ids; GENERATORS[id]() returns a few problems (see diagramq2.js for the shape).
import { MATH } from './diagramq2.js';
import { PHYSICS } from './diagramq3.js';
import { BIOGEN } from './diagramq4.js';

export const GENERATORS = { ...MATH, ...PHYSICS, ...BIOGEN };

const words = (t, re) => new Set((t.match(re) || []).map((w) => w.toLowerCase().replace(/\s+/g, ' '))).size;
const has = (t, re) => re.test(t);

const RULES = [
  // ----- math (these need real maths words, so biology or history notes do not trigger them) -----
  ['read', (t) => words(t, /\b(function notation|f\(x\)|g\(x\)|h\(x\)|vertical line test|relations?|mapping diagrams?|parabolas?|quadratics?|x-intercepts?|y-intercepts?|domain and range)\b/gi) >= 2
    || (has(t, /\bdomain\b/i) && has(t, /\brange\b/i) && has(t, /\b(function|graph|x-values|y-values)\b/i))],
  ['vlt', (t) => has(t, /vertical line test|\brelations?\b/i) && has(t, /function|graph|domain|range/i)],
  ['circle', (t) => has(t, /\brelations?\b|x\s*[²^]\s*2?\s*\+\s*y|circle/i) && has(t, /\bdomain\b/i) && has(t, /\brange\b/i)],
  ['mapping', (t) => has(t, /mapping diagram|function notation|\brelations?\b/i) && has(t, /function/i)],
  ['transform', (t) => has(t, /transformations?|translations?|reflections?|stretch(es)?|compressions?|invariant/i) && has(t, /f\(x\)|graph of|parent function|y\s*=\s*f|invariant/i)],
  ['props', (t) => has(t, /(f\(x\)\s*=\s*(\u221a|sqrt)|y\s*=\s*(\u221a|sqrt)|square root function|radical function)/i) && has(t, /1\s*\/\s*x|reciprocal function|asymptote|properties of/i)],
  ['inverse', (t) => has(t, /inverse (function|relation)|inverse of (a )?function|f\s*(\^|⁻)\s*-?\s*(1|¹)|inverse of f/i)],
  ['rtri', (t) => words(t, /\b(soh ?cah ?toa|sine|cosine|tangent|hypotenuse|right (angle )?triangles?|pythagorean|trigonometr\w+|opposite|adjacent)\b/gi) >= 2 && has(t, /triangle|soh ?cah ?toa|trigonometr|hypotenuse|pythagor/i)],
  ['special', (t) => has(t, /special triangles?|30\D{0,3}60\D{0,3}90|45\D{0,3}45\D{0,3}90|exact values? of (sin|cos|tan)/i)],
  ['std', (t) => has(t, /standard position|terminal arm|co-?terminal|principal angle|related acute/i) || /\bCAST\b/.test(t)],
  ['unitcircle', (t) => has(t, /unit circle|radian measure|radians/i)],
  ['oblique', (t) => has(t, /sine law|cosine law|law of sines|law of cosines|oblique triangle/i)],
  ['ambig', (t) => has(t, /ambiguous case/i)],
  ['sinus', (t) => words(t, /\b(sinusoidal|periodic|amplitude|phase shift|sine function|cosine function|midline|sin\s*x|cos\s*x)\b/gi) >= 2],
  ['exp', (t) => has(t, /exponential (function|growth|decay|graph|equation)|half-life/i)],
  ['ftype', (t) => words(t, /\b(linear|quadratic|exponential)\b/gi) >= 2 && has(t, /function|graph|equation/i)],
  ['seq', (t) => has(t, /(arithmetic|geometric)\s+(sequence|series)|common (difference|ratio)|recursive (formula|sequence)|explicit formula/i)],
  ['linquad', (t) => has(t, /linear[- ]quadratic|points? of intersection|line and (a )?parabola|systems? of (a )?line/i)],
  ['algarea', (t) => has(t, /polynomials?|binomials?|trinomials?|rational expressions?|factor(ing)?/i) && has(t, /area|expand|simplif/i)],
  ['radshape', (t) => has(t, /radicals?|\u221a/i) && has(t, /area|perimeter|rectangle|triangle|square|circle/i)],
  ['disc', (t) => has(t, /discriminant|nature of the roots|real roots/i)],
  ['quadread', (t) => has(t, /(maximum|minimum) (height|value|revenue|area|cost)|completing the square|vertex form|projectile|quadratic (functions?|equations?)/i)],
  ['drpiece', (t) => has(t, /\bdomain\b/i) && has(t, /\brange\b/i) && has(t, /\b(function|graph|set notation)\b/i)],
  ['elev', (t) => has(t, /angles? of (elevation|depression)|lighthouse|line of sight/i)],
  ['pascal', (t) => has(t, /pascal|binomial (expansion|theorem)|expand(ing)? (a )?binomials?/i)],
  // ----- physics -----
  ['fbd', (t) => words(t, /\b(free[- ]body|force diagrams?|net force|normal force|tension|friction|applied force|weight|newtons?|gravitational force|Fnet|F_net)\b/gi) >= 2],
  ['motion', (t) => words(t, /\b(velocity|displacement|position[- ]time|distance[- ]time|acceleration|kinematics|speed|uniform motion)\b/gi) >= 2],
  ['circuit', (t) => words(t, /\b(circuit|resistors?|series|parallel|voltage|current|ohm'?s? law|battery|resistance)\b/gi) >= 2 && has(t, /circuit|resistor|voltage|ohm|battery/i)],
  ['wave', (t) => words(t, /\b(wavelength|amplitude|frequency|crests?|troughs?|transverse|longitudinal|waves?)\b/gi) >= 2 && has(t, /wave|crest|trough/i)],
  // ----- biology -----
  ['mitosis', (t) => words(t, /\b(mitosis|prophase|metaphase|anaphase|telophase|interphase|cell cycle|cytokinesis)\b/gi) >= 2],
  ['meiosis', (t) => words(t, /\b(meiosis|gametes?|crossing over|tetrad|homologous|haploid|diploid)\b/gi) >= 2],
  ['punnett', (t) => words(t, /\b(punnett|genotypes?|phenotypes?|alleles?|heterozygous|homozygous|dominant|recessive|monohybrid)\b/gi) >= 2],
  ['dihybrid', (t) => has(t, /dihybrid/i)],
  ['incomplete', (t) => has(t, /incomplete dominance|co-?dominan|blood types?|multiple alleles/i)],
  ['sexlinked', (t) => has(t, /sex[- ]linked|x[- ]linked|colou?r[- ]?blind|hemophilia/i)],
  ['pedigree', (t) => has(t, /pedigrees?|carriers? of/i)],
  ['karyotype', (t) => has(t, /karyotype|trisomy|down syndrome|nondisjunction|turner syndrome|klinefelter/i)],
  ['plantgroups', (t) => words(t, /\b(bryophytes?|gymnosperms?|angiosperms?|vascular|seedless|monocots?|dicots?|cotyledons?|xylem|phloem|conifers?|mosses|ferns?)\b/gi) >= 2],
  ['symmetry', (t) => has(t, /symmetr|radial|bilateral|asymmetr/i) && has(t, /animal|body plan|symmetr/i)],
  ['bactshape', (t) => words(t, /\b(coccus|cocci|bacillus|bacilli|spirill\w+|spirochetes?|strepto\w*|staphylo\w*|diplo\w*)\b/gi) >= 1 && has(t, /bacteri|prokaryot/i)],
  ['taxonomy', (t) => has(t, /taxonom|kingdom|phylum|binomial nomenclature|classification/i) && words(t, /\b(taxonomy|kingdoms?|phylum|genus|species|classification|binomial nomenclature|domains?|order|family)\b/gi) >= 3],
];

export function detectExtra(text) {
  const out = [];
  for (const [id, test] of RULES) { try { if (test(text) && GENERATORS[id]) out.push(id); } catch { /* ignore a bad rule */ } }
  return out;
}

// How picture-heavy each topic is in a real course (0 = almost never, 1 = nearly every question). Anything not listed counts as 0.4.
const DENSITY = {
  // labelling pictures
  neuron: 0.7, dna: 0.6, virus: 0.6, phage: 0.6, bacterium: 0.6, flower: 0.65, mushroom: 0.55, 'plant-cell': 0.7, 'animal-cell': 0.7,
  graph: 0.6,
  // maths
  props: 0.6, read: 0.65, vlt: 0.6, circle: 0.45, mapping: 0.55, transform: 0.65, inverse: 0.5, rtri: 0.6, special: 0.55, std: 0.55, unitcircle: 0.6, oblique: 0.55, ambig: 0.55,
  sinus: 0.6, linquad: 0.5, algarea: 0.4, radshape: 0.4, disc: 0.45, quadread: 0.5, drpiece: 0.55, elev: 0.65, exp: 0.4, ftype: 0.45, seq: 0.2, pascal: 0.2,
  // physics
  fbd: 0.65, motion: 0.5, circuit: 0.65, wave: 0.6,
  // biology
  mitosis: 0.7, meiosis: 0.7, punnett: 0.55, dihybrid: 0.5, incomplete: 0.5, sexlinked: 0.5, pedigree: 0.7, karyotype: 0.6, taxonomy: 0.35, plantgroups: 0.5, symmetry: 0.5, bactshape: 0.5,
};
export const densityOf = (id) => DENSITY[id] ?? 0.4;
