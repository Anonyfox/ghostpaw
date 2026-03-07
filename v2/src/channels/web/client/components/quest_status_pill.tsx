const STATUS_CLASSES: Record<string, string> = {
  offered: "bg-warning text-dark",
  pending: "bg-secondary",
  active: "bg-info",
  blocked: "bg-warning text-dark",
  done: "bg-success",
  failed: "bg-danger",
  cancelled: "bg-secondary text-decoration-line-through",
  completed: "bg-success",
  abandoned: "bg-secondary text-decoration-line-through",
};

export function QuestStatusPill({ status }: { status: string }) {
  return (
    <span class={`badge ${STATUS_CLASSES[status] ?? "bg-secondary"} rounded-pill`}>{status}</span>
  );
}
