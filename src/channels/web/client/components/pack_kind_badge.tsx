const KIND_STYLES: Record<string, string> = {
  human: "bg-info",
  group: "bg-info bg-opacity-50",
  agent: "bg-success",
  ghostpaw: "bg-primary",
  service: "bg-warning text-dark",
  other: "bg-secondary",
};

interface PackKindBadgeProps {
  kind: string;
}

export function PackKindBadge({ kind }: PackKindBadgeProps) {
  const cls = KIND_STYLES[kind] ?? KIND_STYLES.other;
  return <span class={`badge ${cls}`}>{kind}</span>;
}
