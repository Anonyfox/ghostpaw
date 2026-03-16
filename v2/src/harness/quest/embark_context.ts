import type { Quest, Subgoal } from "../../core/quests/api/types.ts";

export function buildEmbarkBriefing(
  quest: Quest,
  subgoals: Subgoal[],
  wardenFeedback?: string,
): string {
  const parts: string[] = [];

  parts.push(`# Quest: ${quest.title}`);
  if (quest.description) parts.push("", quest.description);
  parts.push("", `Priority: ${quest.priority} | Status: ${quest.status}`);
  if (quest.dueAt) {
    const dueDate = new Date(quest.dueAt).toISOString().slice(0, 10);
    parts.push(`Due: ${dueDate}`);
  }

  if (subgoals.length > 0) {
    const done = subgoals.filter((s) => s.done);
    parts.push("", `## Subgoals (${done.length}/${subgoals.length} done)`);
    for (const s of subgoals) {
      parts.push(`${s.done ? "[x]" : "[ ]"} ${s.text}`);
    }
    const next = subgoals.find((s) => !s.done);
    if (next) {
      parts.push("", `**Next subgoal:** ${next.text}`);
    } else {
      parts.push("", "All subgoals are done. Finalize and verify the quest.");
    }
  } else {
    parts.push("", "No subgoals defined yet. The warden will plan them first.");
  }

  if (wardenFeedback) {
    parts.push("", "## Warden Feedback from Previous Step", "", wardenFeedback);
  }

  parts.push(
    "",
    "## Instructions",
    "",
    "Work on the next incomplete subgoal. Use your tools (filesystem, bash, web, etc.) to make progress.",
    "Do NOT modify quest state directly — the warden handles that.",
    "When you finish meaningful work, summarize what you did.",
  );

  return parts.join("\n");
}
