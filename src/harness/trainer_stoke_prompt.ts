export function buildStokePrompt(
  fragmentSummary: string,
  skillIndex: string,
  trailSignals?: string,
): string {
  const lines = [
    "Background exploration: route pending fragments and mine memories for skill opportunities.",
    "",
    "Current skill index:",
    skillIndex || "(no skills yet)",
    "",
    "Pending fragments:",
    fragmentSummary || "(none)",
  ];

  if (trailSignals) {
    lines.push("", "Trail-derived friction signals:", trailSignals);
  }

  lines.push(
    "",
    "Steps:",
    "1. For each pending fragment, determine if it relates to an existing skill domain.",
    "   If yes, use drop_fragment to re-stash it with the correct domain hint.",
    "   If no existing skill covers it, note it as an orphan.",
    "2. Use recall to search recent memories for friction signals: repeated corrections,",
    "   manual workarounds, improvised workflows, failed attempts that eventually succeeded.",
    "3. For any friction signal not already captured as a fragment, use drop_fragment to",
    "   stash it with an appropriate domain hint.",
    "4. Cluster orphan fragments by theme. If a cluster has 3+ independent observations",
    "   and no matching skill, use queue_proposal to queue a new-skill proposal.",
    "",
    "Constraints:",
    "- Do NOT create, modify, or checkpoint any skills.",
    "- Do NOT edit any files.",
    "- Only use drop_fragment, recall, and queue_proposal.",
    "- Complete within 2 minutes.",
    "",
    "Output a summary of:",
    "- How many fragments were routed to existing skill domains",
    "- How many new fragments were mined from memories",
    "- How many proposals were queued",
  );

  return lines.join("\n");
}
