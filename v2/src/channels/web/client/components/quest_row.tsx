import type { QuestInfo } from "../../shared/quest_types.ts";
import { relativeAge, relativeDue, rruleLabel } from "../../shared/quest_types.ts";
import { QuestPriorityBadge } from "./quest_priority_badge.tsx";
import { QuestStatusPill } from "./quest_status_pill.tsx";

interface Props {
  quest: QuestInfo;
  isExpanded: boolean;
  onToggle: (id: number) => void;
}

export function QuestRow({ quest, isExpanded, onToggle }: Props) {
  const q = quest;
  const recurrence = rruleLabel(q.rrule);
  const isOverdue =
    q.dueAt != null &&
    q.dueAt < Date.now() &&
    !["offered", "done", "failed", "cancelled"].includes(q.status);

  return (
    <button
      type="button"
      class={`d-flex align-items-center gap-2 px-3 py-2 border-bottom quest-row btn border-0 w-100 text-start ${isExpanded ? "quest-row-expanded" : ""}`}
      style="cursor: pointer;"
      onClick={() => onToggle(q.id)}
    >
      <QuestPriorityBadge priority={q.priority} />
      <span class="flex-grow-1 text-truncate">
        {q.title}
        {recurrence && (
          <span class="badge bg-body-secondary text-body-tertiary ms-2 quest-recurrence-badge">
            {recurrence}
          </span>
        )}
      </span>
      <QuestStatusPill status={q.status} />
      {q.dueAt && (
        <span class={`small ${isOverdue ? "text-danger fw-semibold" : "text-body-tertiary"}`}>
          {relativeDue(q.dueAt)}
        </span>
      )}
      {q.questLogId && (
        <span class="badge bg-body-secondary text-body-tertiary">#{q.questLogId}</span>
      )}
      <span class="text-body-tertiary small" style="min-width: 30px; text-align: right;">
        {relativeAge(q.createdAt)}
      </span>
    </button>
  );
}
