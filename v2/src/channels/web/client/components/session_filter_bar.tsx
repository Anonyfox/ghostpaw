import type { SessionStatsResponse } from "../../shared/session_types.ts";

interface Props {
  stats: SessionStatsResponse | null;
  channel: string;
  status: string;
  purpose: string;
  sort: string;
  search: string;
  onChannelChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPurposeChange: (v: string) => void;
  onSortChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onPrune: () => void;
}

const CHANNELS = ["web", "telegram", "delegate", "system", "cli"] as const;

const PURPOSE_LABELS: Record<string, string> = {
  chat: "Chat",
  delegate: "Delegation",
  train: "Training",
  scout: "Scouting",
  system: "System",
};

export function SessionFilterBar(props: Props) {
  const visibleChannels = props.stats
    ? CHANNELS.filter((c) => (props.stats?.byChannel[c] ?? 0) > 0)
    : [];

  return (
    <div class="mb-3">
      <div class="d-flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          class={`btn btn-sm ${props.channel === "" ? "btn-info" : "btn-outline-secondary"}`}
          onClick={() => props.onChannelChange("")}
        >
          All
        </button>
        {visibleChannels.map((ch) => (
          <button
            key={ch}
            type="button"
            class={`btn btn-sm ${props.channel === ch ? "btn-info" : "btn-outline-secondary"}`}
            onClick={() => props.onChannelChange(ch)}
          >
            {ch} {props.stats?.byChannel[ch] ?? 0}
          </button>
        ))}
      </div>

      <div class="d-flex flex-wrap gap-2 align-items-center">
        <select
          class="form-select form-select-sm"
          style="width: auto;"
          value={props.status}
          onChange={(e) => props.onStatusChange((e.target as HTMLSelectElement).value)}
        >
          <option value="">All status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="distilled">Distilled</option>
        </select>

        <select
          class="form-select form-select-sm"
          style="width: auto;"
          value={props.purpose}
          onChange={(e) => props.onPurposeChange((e.target as HTMLSelectElement).value)}
        >
          <option value="">All purposes</option>
          {Object.entries(PURPOSE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          class="form-select form-select-sm"
          style="width: auto;"
          value={props.sort}
          onChange={(e) => props.onSortChange((e.target as HTMLSelectElement).value)}
        >
          <option value="recent">Most Recent</option>
          <option value="oldest">Oldest</option>
          <option value="expensive">Most Expensive</option>
          <option value="tokens">Most Tokens</option>
        </select>

        <input
          type="text"
          class="form-control form-control-sm"
          style="width: 180px;"
          placeholder="Search sessions..."
          value={props.search}
          onInput={(e) => props.onSearchChange((e.target as HTMLInputElement).value)}
        />

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary ms-auto"
          onClick={props.onPrune}
        >
          Prune empty
        </button>
      </div>
    </div>
  );
}
