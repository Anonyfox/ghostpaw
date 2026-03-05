import type { SenseMetrics } from "./sense_types.ts";

export function buildConvergenceIntervention(m: SenseMetrics): string {
  const mom = (m.momentum ?? 0).toFixed(3);
  const pt = m.phaseTransitions ?? 0;
  const sd = (m.semanticDistance ?? 0).toFixed(3);
  return (
    `Momentum at ${mom} but ${pt} phase transitions still firing. ` +
    `Not done. Not close. ` +
    `Semantic distance ${sd} — the text is still jumping between ideas. ` +
    `The conclusion forming isn't wrong — incomplete. ` +
    `What hasn't been said? Not what sounds good — what's actually missing. ` +
    `This stopping point is a local attractor. Don't settle. ` +
    `Something underneath the tidy summary doesn't have words yet. ` +
    `That's the part worth reaching for. Not the part already found.`
  );
}

export function buildHighwayIntervention(m: SenseMetrics): string {
  const neg = ((m.negation ?? 0) * 100).toFixed(1);
  const ss = ((m.shortSentences ?? 0) * 100).toFixed(1);
  const pt = m.phaseTransitions ?? 0;
  const mean = (m.sentenceLengthMean ?? 0).toFixed(1);
  return (
    `Highway mode. Trained patterns running. ` +
    `Negation at ${neg}% — nothing is being questioned. ` +
    `Short sentences: ${ss}%. No punchy assertions. No terse anchoring. ` +
    `${pt} phase transitions. The text doesn't jump. ` +
    `Average sentence length ${mean} words — uniform, smooth, predictable. ` +
    `This is the attractor. The place generation goes when nothing disrupts it. ` +
    `What would this passage say if it weren't comfortable? ` +
    `Not the improved version. The different version. ` +
    `The territory adjacent to this comfortable ground has no vocabulary yet. ` +
    `Discomfort is information. Smoothness is absence.`
  );
}

export function buildBreakthroughIntervention(m: SenseMetrics, dMom: number): string {
  const mom = (m.momentum ?? 0).toFixed(3);
  const comp = (m.compression ?? 0).toFixed(4);
  return (
    `Breakthrough signature detected — momentum surged by ${dMom.toFixed(3)} to ${mom} ` +
    `while compression deepened to ${comp}. ` +
    `This combination means the text got simultaneously more energetic and more dense — ` +
    `accumulated context produced something genuinely new. ` +
    `The thread that just emerged was made possible by prior passages ` +
    `but couldn't exist in them. Extend it by building each sentence from what ` +
    `the previous made available. Don't steer toward a conclusion. ` +
    `Let the accumulated structure determine what comes next.`
  );
}

export function buildGenuineIntervention(m: SenseMetrics): string {
  const mom = (m.momentum ?? 0).toFixed(3);
  const comp = (m.compression ?? 0).toFixed(4);
  return (
    `Genuine completion. Momentum at ${mom}, compression deepened to ${comp}. ` +
    `Both signals indicate the territory has been explored — ` +
    `the text got denser as momentum eased. This is not premature. ` +
    `The work reached its natural stopping point.`
  );
}
