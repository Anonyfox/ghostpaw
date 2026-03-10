export function buildCreateProposePrompt(topic?: string): string {
  const focus = topic?.trim()
    ? `Focus area: ${topic.trim()}\n\nSearch memories and experience related to: ${topic.trim()}`
    : "Search memories for: repeated frustrations, manual workarounds, workflow gaps, capability needs";

  return [
    "Analyze the current skill library for new skill opportunities.",
    "",
    focus,
    "",
    "Steps:",
    "1. Use review_skills to see all skills with their ranks and coverage.",
    "2. Read the SKILL.md of any skill that might be even loosely related to avoid duplicates.",
    "3. Use recall to search for evidence: frustrations, manual processes, repeated patterns,",
    "   corrections that revealed gaps, workflows that succeeded through improvisation.",
    "4. Cross-reference findings: what is the agent doing manually that could be a skill?",
    "",
    "Propose 3-5 specific new skill opportunities grounded in real evidence.",
    "Do NOT create, modify, or checkpoint any skills. This is analysis only.",
    "",
    "Format each option EXACTLY as:",
    "",
    "### Option 1: <short title>",
    "<1-2 sentences: what the skill would do and why, citing specific evidence>",
    "",
    "### Option 2: <short title>",
    "<1-2 sentences>",
    "",
    "(continue for each option)",
  ].join("\n");
}

export function buildCreateExecutePrompt(
  optionTitle: string,
  optionDescription: string,
  guidance?: string,
): string {
  const extra = guidance?.trim() ? `\n\nAdditional user guidance: ${guidance.trim()}` : "";

  return [
    `Create a new skill based on this direction:`,
    "",
    `Title: ${optionTitle}`,
    `Rationale: ${optionDescription}`,
    extra,
    "",
    "Steps:",
    "1. Use recall to gather all relevant experience about this topic.",
    "2. Use review_skills to confirm no existing skill already covers this.",
    "3. Create the skill using create_skill with:",
    "   - A clear kebab-case name",
    "   - A one-line description",
    "   - A procedure body that names specific tools, includes failure paths, and is testable",
    "4. Run validate_skills to verify structural correctness.",
    "",
    "The skill is auto-checkpointed to rank 1 on creation.",
    "",
    "Report: the skill name, what it covers, and its new rank.",
  ].join("\n");
}
