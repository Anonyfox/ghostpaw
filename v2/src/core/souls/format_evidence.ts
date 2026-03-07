import type { DelegationStats, SoulEvidence } from "./gather_evidence.ts";

function formatSuccessRate(s: DelegationStats): string {
  if (s.total === 0) return "no data";
  return `${((s.completed / s.total) * 100).toFixed(1)}% (${s.total} runs)`;
}

function formatAvgCost(s: DelegationStats): string {
  if (s.total === 0) return "—";
  return `$${s.avgCostUsd.toFixed(4)}`;
}

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
  lines.push("## Recent Performance");
  if (evidence.windowedStats.length === 0) {
    lines.push("No windowed stats available.");
  } else {
    lines.push("| Window | Success Rate | Avg Cost | Runs |");
    lines.push("|--------|-------------|----------|------|");
    for (const w of evidence.windowedStats) {
      const s = w.stats;
      lines.push(`| ${w.window} | ${formatSuccessRate(s)} | ${formatAvgCost(s)} | ${s.total} |`);
    }
    lines.push(`| all-time | ${formatSuccessRate(ds)} | ${formatAvgCost(ds)} | ${ds.total} |`);
  }

  lines.push("");
  lines.push("## Trait Effectiveness");
  if (evidence.traitFitness.length === 0) {
    lines.push("No active traits to evaluate.");
  } else {
    for (const f of evidence.traitFitness) {
      const s = f.statsSinceAdded;
      const since = new Date(f.addedAt).toISOString().slice(0, 10);
      lines.push(`- **[#${f.traitId}]** ${f.principle}`);
      if (s.total === 0) {
        lines.push(`  Since ${since}: no delegations yet`);
      } else {
        lines.push(`  Since ${since}: ${formatSuccessRate(s)}, avg cost ${formatAvgCost(s)}`);
      }
    }
  }

  lines.push("");
  lines.push("## Cost Trend");
  const ct = evidence.costTrend;
  if (ct.recent7d === 0 && ct.previous7d === 0) {
    lines.push("No delegation cost data in the last 14 days.");
  } else {
    lines.push(
      `Avg cost/delegation: $${ct.recent7d.toFixed(4)} (last 7d) vs ` +
        `$${ct.previous7d.toFixed(4)} (previous 7d) — **${ct.direction}**`,
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
