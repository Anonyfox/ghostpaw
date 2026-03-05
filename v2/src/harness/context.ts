import type { RankedMemory } from "../core/memory/index.ts";
import { recallMemories } from "../core/memory/index.ts";
import { buildSkillIndex, formatSkillIndex } from "../core/skills/index.ts";
import { MANDATORY_SOUL_IDS, renderSoul } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

const CONTEXT_RECALL_K = 5;
const CONTEXT_RECALL_MIN_SCORE = 0.1;

export interface AssembleContextOptions {
  soulId?: number;
  budgetSummary?: string;
}

export function assembleContext(
  db: DatabaseHandle,
  workspace: string,
  userMessage: string,
  soulIdOrOptions?: number | AssembleContextOptions,
): string {
  const opts: AssembleContextOptions =
    typeof soulIdOrOptions === "number" ? { soulId: soulIdOrOptions } : (soulIdOrOptions ?? {});

  const effectiveSoulId = opts.soulId ?? MANDATORY_SOUL_IDS.ghostpaw;
  const soul = renderSoul(db, effectiveSoulId);
  if (!soul) {
    throw new Error(`Soul ${effectiveSoulId} not found. Run bootstrap before creating the entity.`);
  }

  const sections: string[] = [soul];
  sections.push(formatEnvironment());

  if (opts.budgetSummary) {
    sections.push(`## Budget\n\n${opts.budgetSummary}`);
  }

  const memories = recallMemories(db, userMessage, {
    k: CONTEXT_RECALL_K,
    minScore: CONTEXT_RECALL_MIN_SCORE,
  });
  if (memories.length > 0) {
    sections.push(formatMemories(memories));
  }

  const skillEntries = buildSkillIndex(workspace);
  if (skillEntries.length > 0) {
    sections.push(formatSkillIndex(skillEntries));
  }

  sections.push(formatToolGuidance(effectiveSoulId));
  return sections.join("\n\n");
}

function formatEnvironment(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `## Environment\n\nCurrent date: ${dateStr}`;
}

function formatMemories(memories: RankedMemory[]): string {
  const lines = memories.map((m) => {
    const strength = m.confidence >= 0.7 ? "strong" : m.confidence >= 0.4 ? "moderate" : "faint";
    return `- ${m.claim} [${strength}]`;
  });
  return `## Known Context\n\n${lines.join("\n")}`;
}

function formatToolGuidance(soulId: number): string {
  const base = [
    "## Tools",
    "",
    "You have tools for managing memory, configuration, and API secrets.",
    "The Known Context above was recalled automatically for this conversation.",
    "Use the remember tool when you learn something new worth preserving.",
  ];

  if (soulId === MANDATORY_SOUL_IDS.mentor) {
    base.push(
      "",
      "You have specialist tools for soul development: review_soul, propose_trait, " +
        "revise_trait, revert_trait, reactivate_trait, execute_level_up, revert_level_up. " +
        "These are exclusive to you — other agents delegate soul work to you.",
    );
  } else if (soulId === MANDATORY_SOUL_IDS.trainer) {
    base.push(
      "",
      "You have specialist tools for skill development: review_skills, create_skill, " +
        "checkpoint_skills, skill_diff, skill_history, rollback_skill, validate_skills. " +
        "These are exclusive to you — other agents delegate skill work to you.",
    );
  }

  return base.join("\n");
}
