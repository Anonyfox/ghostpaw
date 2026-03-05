import { Link } from "wouter-preact";
import type { SessionInfo, SessionStatus } from "../../shared/session_types.ts";

interface Props {
  session: SessionInfo;
  expanded: boolean;
  onClick: () => void;
}

function statusColor(status: SessionStatus): string {
  if (status === "open") return "text-success";
  if (status === "distilled") return "text-info";
  return "text-secondary";
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n >= 0.01) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

const PURPOSE_LABELS: Record<string, string> = {
  delegate: "Delegation",
  train: "Training",
  scout: "Scouting",
  system: "System",
};

export function SessionRow({ session, expanded, onClick }: Props) {
  const s = session;
  const totalTokens = s.tokensIn + s.tokensOut;
  const purposeLabel = PURPOSE_LABELS[s.purpose];

  return (
    // biome-ignore lint/a11y/useSemanticElements: row with nested interactive elements
    <div
      role="button"
      tabIndex={0}
      class={`p-2 border-bottom ${expanded ? "bg-body-tertiary" : ""}`}
      style="cursor: pointer;"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div class="d-flex align-items-start gap-2">
        <span class={`${statusColor(s.status)} mt-1`} style="font-size: 0.6rem;">
          ●
        </span>
        <span class="text-body-tertiary small" style="min-width: 28px;">
          {s.channel}
        </span>
        <span class="fw-semibold text-truncate flex-grow-1" style="max-width: 400px;">
          {s.displayName}
        </span>
        {purposeLabel && (
          <span class="badge bg-body-secondary text-body-secondary small">{purposeLabel}</span>
        )}
        <span class="text-body-tertiary small ms-auto">{relativeTime(s.lastActiveAt)}</span>
      </div>

      {s.preview && (
        <div class="text-body-secondary small text-truncate ms-4 ps-2">{s.preview}</div>
      )}

      <div class="d-flex gap-3 ms-4 ps-2 text-body-tertiary small mt-1">
        {s.model && <span>{s.model}</span>}
        <span>{s.messageCount} messages</span>
        <span>{fmtTokens(totalTokens)} tokens</span>
        {s.costUsd > 0 && <span>{fmtUsd(s.costUsd)}</span>}
        {s.delegationCount > 0 && <span class="text-info">{s.delegationCount} delegations</span>}
        <Link
          href={`/chat/${s.id}`}
          class="text-info small ms-auto"
          onClick={(e: Event) => e.stopPropagation()}
        >
          Open in Chat
        </Link>
      </div>
    </div>
  );
}
