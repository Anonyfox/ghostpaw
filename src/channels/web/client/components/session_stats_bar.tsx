import type { SessionStatsResponse } from "../../shared/session_types.ts";

interface Props {
  stats: SessionStatsResponse;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span class="me-4">
      <span class="text-body-secondary small">{label}</span>{" "}
      <span class="fw-semibold">{value}</span>
    </span>
  );
}

export function SessionStatsBar({ stats }: Props) {
  const channelParts = Object.entries(stats.byChannel)
    .sort((a, b) => b[1] - a[1])
    .map(([ch, n]) => `${ch} ${n}`)
    .join(" | ");

  return (
    <div class="mb-3 d-flex flex-wrap align-items-center">
      <Stat label="Total" value={`${stats.total} (${stats.open} open)`} />
      {channelParts && <span class="text-body-tertiary small me-4">{channelParts}</span>}
    </div>
  );
}
