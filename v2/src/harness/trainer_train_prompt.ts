export function buildTrainProposePrompt(skillName: string, skillContent: string): string {
  return [
    `Review and analyze improvements for skill: ${skillName}`,
    "",
    "Current skill content:",
    "---",
    skillContent,
    "---",
    "",
    "Steps:",
    "1. Use skill_history to see this skill's evolution and past checkpoints.",
    "2. Use skill_diff to see any uncommitted changes since the last checkpoint.",
    `3. Use recall to search memories about: ${skillName} usage, related workflows, edge cases, corrections.`,
    "4. Consider: what edge cases are missing? What procedures are stale? What could be",
    "   more specific? What has the agent learned from practice that this skill doesn't capture?",
    "",
    "Propose 2-4 specific improvement paths for this skill, grounded in evidence.",
    "Do NOT modify, edit, or checkpoint anything. This is analysis only.",
    "",
    "Format each option EXACTLY as:",
    "",
    "### Option 1: <short title>",
    "<1-2 sentences: what would change and why, citing evidence from memories or usage>",
    "",
    "### Option 2: <short title>",
    "<1-2 sentences>",
    "",
    "(continue for each option)",
  ].join("\n");
}

export function buildTrainExecutePrompt(
  skillName: string,
  optionTitle: string,
  optionDescription: string,
  guidance?: string,
): string {
  const extra = guidance?.trim() ? `\n\nAdditional user guidance: ${guidance.trim()}` : "";

  return [
    `Improve skill "${skillName}" with this specific improvement:`,
    "",
    `Title: ${optionTitle}`,
    `Rationale: ${optionDescription}`,
    extra,
    "",
    "Steps:",
    `1. Read the current skill file at skills/${skillName}/SKILL.md.`,
    "2. Use recall to gather evidence supporting this improvement.",
    "3. Apply the improvement using edit. Be additive and specific:",
    "   - Do not remove existing working content without good reason",
    "   - Add failure paths if missing",
    "   - Compress verbose sections where possible",
    "   - Keep skills under 80 lines; split if needed",
    "4. Run validate_skills to verify structural correctness.",
    "5. Use checkpoint_skills to commit the improvement.",
    "",
    "CRITICAL: The improvement MUST be checkpointed before you finish.",
    "Only checkpoint if the change genuinely improves reliability in practice.",
    "",
    "Report: what changed, what was kept, and the new rank.",
  ].join("\n");
}
