import type { QuestStatus } from "../../shared/quest_types.ts";

const STATUS_CLASSES: Record<QuestStatus, string> = {
  offered: "bg-warning text-dark",
  pending: "bg-secondary",
  active: "bg-info",
  blocked: "bg-warning text-dark",
  done: "bg-success",
  failed: "bg-danger",
  cancelled: "bg-secondary text-decoration-line-through",
};

export function QuestStatusPill({ status }: { status: QuestStatus }) {
  return (
    <span class={`badge ${STATUS_CLASSES[status] ?? "bg-secondary"} rounded-pill`}>
      {status}
    </span>
  );
}
