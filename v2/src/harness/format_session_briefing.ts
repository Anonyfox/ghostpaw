import type { SessionBriefing } from "../core/trail/api/read/index.ts";
import type { WarmthData } from "./get_warmth.ts";

export function formatSessionBriefing(
  briefing: SessionBriefing,
  warmth?: WarmthData | null,
): string | null {
  const lines: string[] = [];

  if (warmth) {
    const bondSnippet = warmth.userBond ? ` — ${truncate(warmth.userBond, 100)}` : "";
    lines.push(`Talking to: ${warmth.userName}${bondSnippet}`);

    for (const b of warmth.beliefs) {
      lines.push(`- [${b.category}] ${b.claim}`);
    }
  }

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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
