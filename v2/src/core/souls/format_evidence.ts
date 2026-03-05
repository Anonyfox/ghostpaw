import type { SoulEvidence } from "./gather_evidence.ts";

export function formatSoulEvidence(evidence: SoulEvidence): string {
  const lines: string[] = [];

  lines.push(`# Evidence Report: ${evidence.soulName}`);
  lines.push("");
  lines.push(`**Level:** ${evidence.level}`);
  lines.push(
    `**Active traits:** ${evidence.activeTraitCount}/${evidence.traitLimit}${evidence.atCapacity ? " (AT CAPACITY)" : ""}`,
  );
  if (evidence.description) {
    lines.push(`**Description:** ${evidence.description}`);
  }

  lines.push("");
  lines.push("## Essence");
  if (evidence.essence) {
    lines.push(evidence.essence);
  } else {
    lines.push("No essence defined yet.");
  }

  lines.push("");
  lines.push("## Delegation Performance");
  const ds = evidence.delegationStats;
  if (ds.total === 0) {
    lines.push("No delegation runs recorded yet.");
  } else {
    const successRate = ((ds.completed / ds.total) * 100).toFixed(1);
    lines.push(`- **Total runs:** ${ds.total}`);
    lines.push(
      `- **Success rate:** ${successRate}% (${ds.completed} completed, ${ds.failed} failed)`,
    );
    lines.push(`- **Total cost:** $${ds.totalCostUsd.toFixed(4)}`);
    lines.push(`- **Avg cost/run:** $${ds.avgCostUsd.toFixed(4)}`);
    lines.push(
      `- **Total tokens:** ${ds.totalTokensIn + ds.totalTokensOut} (${ds.totalTokensIn} in, ${ds.totalTokensOut} out)`,
    );
  }

  lines.push("");
  lines.push("## Active Traits");
  if (evidence.activeTraits.length === 0) {
    lines.push("No active traits.");
  } else {
    for (const t of evidence.activeTraits) {
      lines.push(`- **[#${t.id}]** ${t.principle}`);
      lines.push(`  Provenance: ${t.provenance}`);
      lines.push(`  Generation: ${t.generation}, added: ${new Date(t.createdAt).toISOString()}`);
    }
  }

  if (evidence.revertedTraits.length > 0) {
    lines.push("");
    lines.push("## Reverted Traits");
    for (const t of evidence.revertedTraits) {
      lines.push(`- **[#${t.id}]** ${t.principle} (was: ${t.provenance})`);
    }
  }

  if (evidence.consolidatedTraits.length > 0 || evidence.promotedTraits.length > 0) {
    lines.push("");
    lines.push("## Evolutionary History");
    if (evidence.consolidatedTraits.length > 0) {
      lines.push(`- ${evidence.consolidatedTraits.length} traits consolidated across level-ups`);
    }
    if (evidence.promotedTraits.length > 0) {
      lines.push(`- ${evidence.promotedTraits.length} traits promoted to permanent status`);
    }
  }

  if (evidence.levelHistory.length > 0) {
    lines.push("");
    lines.push("## Level-Up History");
    for (const l of evidence.levelHistory) {
      lines.push(
        `- **Level ${l.level}** (${new Date(l.createdAt).toISOString()}): ` +
          `${l.traitsConsolidatedCount} consolidated, ${l.traitsPromotedCount} promoted, ` +
          `${l.traitsCarriedCount} carried, ${l.traitsMergedCount} merged`,
      );
    }
  }

  lines.push("");
  lines.push(`## Related Memories: ${evidence.relatedMemoryCount}`);

  return lines.join("\n");
}
