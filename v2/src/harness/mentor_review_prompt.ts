export function buildReviewPrompt(soulName: string): string {
  return [
    `Review the "${soulName}" soul.`,
    "",
    "Use the review_soul tool to gather evidence from delegation runs, memories, and trait history.",
    "Assess current fitness, identify strengths and potential areas for growth.",
    "Report your full findings including specific observations and recommendations.",
  ].join("\n");
}
