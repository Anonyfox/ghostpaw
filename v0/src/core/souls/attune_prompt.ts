import type { CrystallizationRecord } from "@ghostpaw/souls";

/**
 * Builds the user prompt for a mentor agent session given a crystallization record.
 * The mentor receives this as its task and uses its tools to inspect, decide, and act.
 */
export function buildAttunePrompt(record: CrystallizationRecord, soulName: string): string {
  return [
    `Soul "${soulName}" (id ${record.soulId}) has crossed the crystallization threshold.`,
    "",
    `Pending shards: ${record.pendingCount}`,
    `Source diversity: ${record.sourceDiversity}`,
    `Age spread: ${record.ageSpreadDays.toFixed(1)} days`,
    `Cluster count: ${record.clusterCount}`,
    `Priority score: ${record.priorityScore.toFixed(2)}`,
    "",
    "Use inspect_souls_item with includeEvidence: true to review this soul's full evidence report.",
    "Based on the evidence, decide whether to add, revise, or revert traits using refine_soul.",
    "Cite the shards that motivated each change. Then stamp the soul as attuned.",
    "If the soul reaches trait capacity after your changes, guide it through a level-up.",
  ].join("\n");
}
