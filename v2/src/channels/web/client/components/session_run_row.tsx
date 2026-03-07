import { Link } from "wouter-preact";
import type { SessionRunInfo } from "../../shared/session_types.ts";

interface Props {
  run: SessionRunInfo;
}

function statusColor(status: string): string {
  if (status === "completed") return "text-success";
  if (status === "running") return "text-warning";
  return "text-danger";
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

export function SessionRunRow({ run }: Props) {
  const task = run.task ?? "";
  const taskPreview = task.length > 80 ? `${task.slice(0, 77)}...` : task;
  const totalTokens = run.tokensIn + run.tokensOut;

  return (
    <div class="d-flex flex-column gap-1 p-2 bg-body-tertiary rounded mb-1">
      <div class="d-flex align-items-center gap-2">
        <span class={statusColor(run.status)} style="font-size: 0.6rem;">
          ●
        </span>
        <span class="fw-semibold small">{run.specialist}</span>
        <span class="text-body-secondary small text-truncate flex-grow-1">"{taskPreview}"</span>
        {run.costUsd > 0 && <span class="text-body-tertiary small">{fmtUsd(run.costUsd)}</span>}
        <span class="text-body-tertiary small">{relativeTime(run.createdAt)}</span>
      </div>

      <div class="d-flex gap-3 ms-3 text-body-tertiary small">
        <span class={statusColor(run.status)}>{run.status}</span>
        <span>{fmtTokens(totalTokens)} tokens</span>
        {run.childSessionId && (
          <Link
            href={`/chat/${run.childSessionId}`}
            class="text-info"
            onClick={(e: Event) => e.stopPropagation()}
          >
            View child session
          </Link>
        )}
      </div>

      {run.status === "failed" && run.error && (
        <div class="text-danger small ms-3">{run.error}</div>
      )}
    </div>
  );
}
