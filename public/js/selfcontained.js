// A question must be answerable from its own wording. An AI-written question sometimes says "look at the diagram below" or
// "according to the notes" when nothing is shown, and the student is left to find an answer from nothing. Those are dropped.
const POINTS_AT_NOTHING = [
  /\b(?:the|this|that|these|those)\s+(?:diagram|figure|graph|picture|image|photo|illustration|chart|table|map|slide|passage|excerpt|text|notes|reading|handout|worksheet|data set|dataset)\b/i,
  /\b(?:shown|given|displayed|illustrated|pictured|depicted|provided)\s+(?:above|below|here|in the)/i,
  /\b(?:above|below)\s+(?:diagram|figure|graph|picture|image|table|chart|text|data|circuit|triangle)\b/i,
  /\bfollowing\s+(?:diagrams?|figures?|graphs?|pictures?|images?|tables?|charts?|passages?|data|circuits?|triangles?|maps?|cells?|structures?|information)\b/i,
  /\b(?:look at|refer to|see|study|examine|use)\s+(?:the\s+)?(?:diagram|figure|graph|picture|image|table|chart|map)\b/i,
  /\bin the\s+(?:diagram|figure|graph|picture|image|table|chart|map)\b/i,
  /\baccording to (?:the|your)\s+(?:notes|text|passage|slide|reading|handout)\b/i,
  /\b(?:the|your)\s+(?:notes|slides?)\s+(?:say|says|state|states|mention|mentions|describe|describes)\b/i,
];

export function selfContained(q) {
  const text = [q.q, ...(q.options || [])].join(' ');
  if (q.diagram) return true; // a picture is attached, so pointing at it is fine
  if (String(q.q || '').trim().split(/\s+/).length < 3) return false;
  return !POINTS_AT_NOTHING.some((re) => re.test(text));
}
