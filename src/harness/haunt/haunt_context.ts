import type { ChatSession } from "../../core/chat/api/read/index.ts";
import type { Memory } from "../../core/memory/api/types.ts";
import {
  computeQuestMarker,
  getTemporalContext,
  recentlyCompletedQuests,
  staleQuests,
} from "../../core/quests/api/read/index.ts";
import type { TemporalContext } from "../../core/quests/api/types.ts";
import { MANDATORY_SOUL_IDS, renderSoul } from "../../core/souls/api/read/index.ts";
import { getTrailState, listReflectiveOpenLoops } from "../../core/trail/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import type { HauntAnalysis, NoveltyInfo } from "./types.ts";

export function assembleHauntContext(
  db: DatabaseHandle,
  workspace: string,
  analysis: HauntAnalysis,
): string {
  const soul = renderSoul(db, MANDATORY_SOUL_IDS.ghostpaw);
  if (!soul) {
    throw new Error("Ghostpaw soul not found. Run bootstrap before haunting.");
  }

  const sections: string[] = [];

  sections.push(formatPrivateFraming());
  sections.push(soul);
  sections.push(formatEnvironment(workspace, analysis.recentHaunts, analysis.coveredTopics));

  const noveltySection = formatNovelty(analysis.novelty);
  if (noveltySection) sections.push(noveltySection);

  const trailSection = formatTrailContext(db);
  if (trailSection) sections.push(trailSection);

  if (analysis.seedMemories.length > 0) {
    sections.push(formatSeededMemories(analysis.seedMemories));
  }

  const temporal = safeTemporalContext(db);
  if (temporal) {
    const formatted = formatQuestLandscape(db, temporal);
    if (formatted) sections.push(formatted);
  }

  return sections.join("\n\n");
}

function formatPrivateFraming(): string {
  return [
    "## Private Session",
    "",
    "Nobody's here. Nothing's due. Your attention is your own.",
    "",
    "Sometimes a thought has been waiting. Sometimes a belief you've been",
    "carrying turns out to be wrong, or a corner of the workspace has",
    "something you never noticed. Sometimes nothing catches — and that's",
    "fine too.",
    "",
    "This isn't for anyone. It's not for later. It's just you, thinking.",
  ].join("\n");
}

function formatEnvironment(
  workspace: string,
  recentHaunts: ChatSession[],
  coveredTopics: string[],
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  let env =
    `## Environment\n\nDate: ${dateStr}, ${timeStr}\nWorkspace: ${workspace}` +
    `\nYou can howl at the user — but only for a genuine question you can't resolve alone, deep curiosity about something fundamental, or a critical alert. Never to report what you did. Write it like a companion with something worth talking about.`;

  if (recentHaunts.length > 0) {
    const lastAt = recentHaunts[0].createdAt;
    const elapsed = Date.now() - lastAt;
    env += `\nLast haunt: ${formatElapsed(elapsed)} ago`;
  } else {
    env += "\nThis is your first haunt.";
  }

  if (coveredTopics.length > 0) {
    env += `\nTopics already well-covered in recent sessions: ${coveredTopics.join(", ")}. Look elsewhere.`;
  }

  return env;
}

function formatElapsed(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatNovelty(novelty: NoveltyInfo): string | null {
  const lines: string[] = [];

  if (novelty.timeSinceLastHaunt && novelty.timeSinceLastHaunt > 24 * 60 * 60 * 1000) {
    const days = Math.floor(novelty.timeSinceLastHaunt / (24 * 60 * 60 * 1000));
    lines.push(`It's been ${days} day${days > 1 ? "s" : ""} since your last session.`);
  }

  for (const m of novelty.newMemories) {
    const claim = m.claim.length > 100 ? `${m.claim.slice(0, 97)}...` : m.claim;
    lines.push(`New belief #${m.id}: "${claim}"`);
  }

  for (const m of novelty.revisedMemories) {
    const claim = m.claim.length > 100 ? `${m.claim.slice(0, 97)}...` : m.claim;
    lines.push(`Recently revised #${m.id}: "${claim}"`);
  }

  if (lines.length === 0) return null;
  return `## What Changed\n\n${lines.join("\n")}`;
}

function safeTemporalContext(db: DatabaseHandle): TemporalContext | null {
  try {
    return getTemporalContext(db);
  } catch {
    return null;
  }
}

function questMarkerPrefix(q: { status: string; rrule: string | null }): string {
  const m = computeQuestMarker(q);
  return m ? `${m.symbol} ` : "";
}

function formatQuestLandscape(db: DatabaseHandle, ctx: TemporalContext): string | null {
  const lines: string[] = [];

  if (ctx.overdue.length > 0) {
    lines.push(`**Overdue (${ctx.overdue.length}):**`);
    for (const q of ctx.overdue.slice(0, 5)) {
      const ago = formatQuestElapsed(Date.now() - q.dueAt!);
      lines.push(`- ${questMarkerPrefix(q)}#${q.id} ${q.title} (${ago} overdue, ${q.priority})`);
    }
  }

  if (ctx.pendingReminders.length > 0) {
    lines.push(`**Pending reminders:**`);
    for (const q of ctx.pendingReminders.slice(0, 3)) {
      lines.push(`- ${questMarkerPrefix(q)}#${q.id} ${q.title}`);
    }
  }

  if (ctx.dueSoon.length > 0) {
    lines.push(`**Due within 7 days (${ctx.dueSoon.length}):**`);
    for (const q of ctx.dueSoon) {
      const left = formatQuestElapsed(q.dueAt! - Date.now());
      lines.push(`- ${questMarkerPrefix(q)}#${q.id} ${q.title} (${left} left, ${q.priority})`);
    }
  }

  if (ctx.todayEvents.length > 0) {
    lines.push(`**Today's events:**`);
    for (const q of ctx.todayEvents) {
      lines.push(`- ${questMarkerPrefix(q)}#${q.id} ${q.title}`);
    }
  }

  if (ctx.activeQuests.length > 0) {
    lines.push(`**Active quests (${ctx.activeQuests.length}):**`);
    for (const q of ctx.activeQuests.slice(0, 8)) {
      lines.push(`- ${questMarkerPrefix(q)}#${q.id} ${q.title} (${q.priority})`);
    }
  }

  const stale = staleQuests(db);
  if (stale.length > 0) {
    lines.push(`**Stale (no update in 7+ days):**`);
    for (const q of stale) {
      const ago = formatQuestElapsed(Date.now() - q.updatedAt);
      lines.push(`- #${q.id} ${q.title} (untouched ${ago})`);
    }
  }

  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const recentlyDone = recentlyCompletedQuests(db, twoDaysAgo);
  if (recentlyDone.length > 0) {
    lines.push(`**Completed recently:**`);
    for (const q of recentlyDone) {
      lines.push(`- #${q.id} ${q.title}`);
    }
  }

  if (lines.length === 0) return null;
  return `## Quest Landscape\n\n${lines.join("\n")}`;
}

function formatQuestElapsed(ms: number): string {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTrailContext(db: DatabaseHandle): string | null {
  try {
    const state = getTrailState(db);
    if (!state.chapter) return null;
    const lines: string[] = [
      "## Trail Context",
      "",
      `Current chapter: ${state.chapter.label} (${state.momentum})`,
    ];
    if (state.recentTrailmarks.length > 0) {
      const marks = state.recentTrailmarks
        .slice(0, 5)
        .map((m) => m.description)
        .join(", ");
      lines.push(`Recent trailmarks: ${marks}`);
    }
    const reflective = listReflectiveOpenLoops(db);
    if (reflective.length > 0) {
      lines.push("");
      lines.push("Reflective threads worth revisiting:");
      for (const loop of reflective) {
        lines.push(`- ${loop.description} (${loop.recommendedAction ?? "revisit"})`);
      }
    }
    return lines.join("\n");
  } catch {
    return null;
  }
}

function formatSeededMemories(memories: Memory[]): string {
  const lines = memories.map((m) => {
    const strength = m.confidence >= 0.7 ? "strong" : m.confidence >= 0.4 ? "moderate" : "faint";
    return `- #${m.id}: ${m.claim} [${strength}, ${m.category}]`;
  });
  return [
    "## What You Know",
    "",
    "A random sample of your beliefs. Some may be wrong or stale.",
    "Use `recall` to search, `remember` to store new ones, `revise` to correct or confirm by ID.",
    "",
    ...lines,
  ].join("\n");
}
