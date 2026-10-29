export const GRADES = {
  applied: {
    label: 'Applied',
    sub: 'High school',
    style: 'Grade-level: high school APPLIED. Use plain, concrete wording and short sentences. Focus on recall of key terms, definitions, steps and real-life examples. Avoid abstract or multi-step reasoning. Distractors should be clearly different from the answer.',
  },
  academic: {
    label: 'Academic',
    sub: 'High school',
    style: 'Grade-level: high school ACADEMIC. Mix recall with understanding: explain why/how, cause and effect, and simple reasoning. Distractors should be plausible.',
  },
  college: {
    label: 'College',
    sub: 'Diploma / applied',
    style: 'Grade-level: COLLEGE. Emphasize practical application: short scenarios, procedures, and "what would you do" questions alongside key terminology. Distractors should be plausible and close to the answer.',
  },
  university: {
    label: 'University',
    sub: 'Undergrad and up',
    style: 'Grade-level: UNIVERSITY. Emphasize analysis, compare/contrast, evaluation, and applying concepts to new situations, using precise terminology. Distractors should be subtle and tempting.',
  },
};

// How hard the questions are. The topics stay the same; only the depth and how close the wrong options are change.
export const DIFFICULTY = {
  easy: {
    label: 'Easy',
    desc: 'Direct recall and one-step questions. Wrong options are clearly different from the right answer.',
    style: 'Difficulty: EASY. Ask direct recall questions (definitions, single facts, one-step calculations) in simple wording. Wrong options must be clearly different from the correct one.',
  },
  medium: {
    label: 'Medium',
    desc: 'A mix of recall and understanding. Wrong options are believable. Like a normal test.',
    style: 'Difficulty: MEDIUM. Mix recall with understanding (why and how, short calculations). Wrong options should be believable.',
  },
  hard: {
    label: 'Hard',
    desc: 'Multi-step and application questions. Wrong options are close to the right answer, so you have to be sure.',
    style: 'Difficulty: HARD. Ask multi-step, application and reasoning questions (explain why, predict what happens, compare, combine two ideas, calculations with several steps). Wrong options must be very close to the correct answer and reflect common mistakes. Stay on the topics in the notes: do not add new topics.',
  },
};
export const levelOf = (d) => (DIFFICULTY[d] ? d : 'medium');
export const LEVEL_ORDER = ['easy', 'medium', 'hard'];
// One level or several (older saved quizzes hold a single word): always an array, easiest first, medium if nothing valid.
export const levelsOf = (d) => {
  const list = LEVEL_ORDER.filter((l) => (Array.isArray(d) ? d : [d]).includes(l));
  return list.length ? list : ['medium'];
};
export const levelText = (d) => levelsOf(d).map((l) => DIFFICULTY[l].label).join(' + ');
// Splits a question count between the chosen levels as evenly as possible, for example 10 over easy and hard is 5 and 5, 5 over two is 3 and 2.
export function splitCount(count, levels) {
  const ls = levelsOf(levels);
  return ls.map((l, i) => Math.floor(count / ls.length) + (i < count % ls.length ? 1 : 0));
}

export const QTYPES = {
  mc: 'Multiple choice',
  tf: 'True / false',
  fill: 'Fill in the blank',
  short: 'Short answer',
};

export const TRANSCRIBE = `Transcribe ALL the text in these photos of student notes, in reading order.
Keep headings, bullet points, numbering, formulas and tables as plain text lines. Do not summarize, fix, or add anything.
If there is a diagram or picture, add one short line describing it in [square brackets].
If there are several photos, separate them with a line containing only ---.
Output only the transcription.`;

export const CARD_SYSTEM = `You turn student notes into active-recall flashcards. Reply with ONLY a JSON array, no prose, no code fences:
[{"q":"question","a":"answer","topic":"short topic label"}]
Rules:
- Cover EVERYTHING in the notes: every definition, term, fact, date, formula, step, list item, cause/effect and example. Skip nothing.
- One idea per card. Several cards are better than one crowded card.
- Each question must make sense on its own (never say "in the notes" or "above").
- Answers are concise but complete and use the notes' own wording.
- Never invent facts that are not in the notes.`;

// One level: its style line. Several: how many questions of each, so a mix of easy and hard really has both.
function difficultyText(difficulty, count) {
  const ls = levelsOf(difficulty);
  if (ls.length === 1) return DIFFICULTY[ls[0]].style;
  const counts = splitCount(count, ls);
  return `Difficulty MIX: write exactly ${ls.map((l, i) => `${counts[i]} ${l.toUpperCase()}`).join(' and ')} questions. ${ls.map((l) => DIFFICULTY[l].style).join(' ')} Put "level":"easy"|"medium"|"hard" on every question.`;
}

export function quizSystem({ grade, count, types, hasNotes, difficulty }) {
  const t = types.map((k) => ({
    mc: '"mc": multiple choice with exactly 4 options and "answer" = index (0-3) of the correct option',
    tf: '"tf": true/false statement with "answer" = true or false',
    fill: '"fill": a sentence with ___ for the missing word or phrase, "answer" = the missing text (short)',
    short: '"short": open question, "answer" = a model answer in 1-2 sentences',
  }[k])).join('\n- ');
  return `You write quizzes for students. ${GRADES[grade].style} ${difficultyText(difficulty, count)}
Reply with ONLY a JSON array of exactly ${count} questions, no prose, no code fences:
[{"type":"mc","q":"...","options":["..","..","..",".."],"answer":0,"explanation":"one sentence why","topic":"short label"}]
Allowed question types (mix them):
- ${t}
Rules:
- ${hasNotes ? 'Base every question ONLY on the provided notes, and spread questions across all of the topics in them.' : 'Questions must be accurate, standard curriculum knowledge for the topic.'}
- For mc, make the wrong options plausible and put the correct option in a varied position.
- Every question needs a one-sentence "explanation".`;
}
