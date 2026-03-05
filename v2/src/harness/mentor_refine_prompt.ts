export function buildRefinePrompt(soulName: string, feedback: string): string {
  return [
    `Review the "${soulName}" soul. External feedback has been provided:`,
    "",
    `"${feedback}"`,
    "",
    "Use review_soul to gather evidence, then decide the best action:",
    "- propose_trait: add a new trait if the feedback identifies a missing capability",
    "- revise_trait: update an existing trait if the feedback suggests refinement",
    "- revert_trait: remove a trait if the feedback indicates it's harmful",
    "",
    "Execute your chosen action with proper provenance citing this external feedback.",
    "Explain your reasoning clearly.",
  ].join("\n");
}
