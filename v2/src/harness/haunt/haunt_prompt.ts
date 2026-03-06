import type { HauntAnalysis } from "./types.ts";

const FIRST_HAUNT_SEED = "Everything is new. What catches your eye?";

export function buildHauntPrompt(analysis: HauntAnalysis): string {
  if (analysis.hauntCount === 0) return FIRST_HAUNT_SEED;
  return analysis.seed;
}

export const TEXT_ONLY_CONTINUATION = [
  "[Automated signal — this session has no audience.]",
  "If something from your last thought is worth investigating, pick a tool and check it.",
  "Otherwise, follow whatever thread is pulling you.",
].join("\n");

export const WRAP_UP = "Wrap up your thoughts.";
