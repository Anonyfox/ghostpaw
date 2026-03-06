import type { RankedMemory } from "../core/memory/index.ts";
import { recallMemories } from "../core/memory/index.ts";
import type { TemporalContext } from "../core/quests/index.ts";
import { getTemporalContext } from "../core/quests/index.ts";
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

  const temporal = safeTemporalContext(db);
  if (temporal) {
    const formatted = formatTemporalContext(temporal);
    if (formatted) sections.push(formatted);
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

function safeTemporalContext(db: DatabaseHandle): TemporalContext | null {
  try {
    return getTemporalContext(db);
  } catch {
    return null;
  }
}

function formatTemporalContext(ctx: TemporalContext): string | null {
  const lines: string[] = [];

  if (ctx.overdue.length > 0) {
    lines.push(`**Overdue (${ctx.overdue.length}):**`);
    for (const q of ctx.overdue.slice(0, 5)) {
      const ago = formatElapsed(Date.now() - q.dueAt!);
      lines.push(`- #${q.id} ${q.title} (${ago} overdue, ${q.priority})`);
    }
  }

  if (ctx.pendingReminders.length > 0) {
    lines.push(`**Reminders:**`);
    for (const q of ctx.pendingReminders.slice(0, 3)) {
      lines.push(`- #${q.id} ${q.title}`);
    }
  }

  if (ctx.dueSoon.length > 0) {
    lines.push(`**Due soon (${ctx.dueSoon.length}):**`);
    for (const q of ctx.dueSoon.slice(0, 5)) {
      const left = formatElapsed(q.dueAt! - Date.now());
      lines.push(`- #${q.id} ${q.title} (${left} left, ${q.priority})`);
    }
  }

  if (ctx.todayEvents.length > 0) {
    lines.push(`**Today:**`);
    for (const q of ctx.todayEvents.slice(0, 5)) {
      lines.push(`- #${q.id} ${q.title}`);
    }
  }

  if (ctx.activeQuests.length > 0) {
    lines.push(`**Active (${ctx.activeQuests.length}):**`);
    for (const q of ctx.activeQuests.slice(0, 5)) {
      lines.push(`- #${q.id} ${q.title} (${q.priority})`);
    }
  }

  if (lines.length === 0) return null;
  return `## Quests\n\n${lines.join("\n")}`;
}

function formatElapsed(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatToolGuidance(soulId: number): string {
  const base = [
    "## Tools",
    "",
    "You have tools for managing memory, quests, pack, configuration, and API secrets.",
    "The Known Context above was recalled automatically for this conversation.",
    "Use the remember tool when you learn something new worth preserving.",
    "Use quest tools to create, update, complete, or query tasks and events.",
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
