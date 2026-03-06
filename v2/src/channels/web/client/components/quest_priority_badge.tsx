import type { QuestPriority } from "../../shared/quest_types.ts";

export function QuestPriorityBadge({ priority }: { priority: QuestPriority }) {
  if (priority === "normal" || priority === "low") return null;
  if (priority === "urgent") {
    return <span class="text-danger fw-bold small" title="Urgent">!!</span>;
  }
  return <span class="text-warning small" title="High priority">!</span>;
}
