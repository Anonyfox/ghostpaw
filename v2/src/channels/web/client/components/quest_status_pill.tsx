const STATUS_CLASSES: Record<string, string> = {
  offered: "bg-warning text-dark",
  accepted: "bg-secondary",
  active: "bg-info",
  blocked: "bg-warning text-dark",
  done: "bg-success",
  failed: "bg-danger",
  abandoned: "bg-secondary text-decoration-line-through",
  completed: "bg-success",
};

export function QuestStatusPill({ status }: { status: string }) {
  return (
    <span class={`badge ${STATUS_CLASSES[status] ?? "bg-secondary"} rounded-pill`}>{status}</span>
  );
}
