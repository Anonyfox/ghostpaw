import type { SessionBriefing } from "../core/trail/api/read/index.ts";

export function formatSessionBriefing(briefing: SessionBriefing): string | null {
  const lines: string[] = [];

  if (briefing.chapter) {
    lines.push(`Current chapter: ${briefing.chapter.label} (${briefing.chapter.momentum})`);
  }

  const topLoops = briefing.openLoops.slice(0, 3);
  for (const loop of topLoops) {
    lines.push(`- ${loop.description} (significance ${loop.significance})`);
  }

  const topOmens = briefing.unresolvedOmens.slice(0, 2);
  for (const omen of topOmens) {
    lines.push(`- Omen: ${omen.forecast} (confidence ${omen.confidence})`);
  }

  if (lines.length === 0) return null;
  return `## Current Context\n\n${lines.join("\n")}`;
}
