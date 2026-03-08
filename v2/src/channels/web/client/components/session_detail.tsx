import { useEffect, useState } from "preact/hooks";
import { Link } from "wouter-preact";
import type { SessionDetailResponse } from "../../shared/session_types.ts";
import { relativeTime } from "../relative_time.ts";
import { SessionRunRow } from "./session_run_row.tsx";
import { SessionTranscript } from "./session_transcript.tsx";

interface Props {
  sessionId: number;
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

export function SessionDetail({ sessionId }: Props) {
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => setData(d as SessionDetailResponse))
      .catch((e) => setError(String(e)));
  }, [sessionId]);

  if (error) return <p class="text-danger small">{error}</p>;
  if (!data) return <p class="text-body-tertiary small">Loading...</p>;

  const s = data.session;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper
    <section onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {data.parentSession && (
        <div class="mb-2 small">
          <span class="text-body-secondary">Delegated from: </span>
          <Link href={`/chat/${data.parentSession.id}`} class="text-info">
            {data.parentSession.displayName}
          </Link>
        </div>
      )}

      <div class="bg-body-secondary rounded p-2 mb-2 small">
        <div class="d-flex flex-wrap gap-3 align-items-center">
          <span>
            <span class="text-body-secondary">Channel:</span> {s.channel}
          </span>
          <span>
            <span class="text-body-secondary">Purpose:</span> {s.purpose}
          </span>
          <span>
            <span class="text-body-secondary">Status:</span> {s.status}
          </span>
          {s.model && (
            <span>
              <span class="text-body-secondary">Model:</span> {s.model}
            </span>
          )}
          <Link href={`/chat/${s.id}`} class="text-info ms-auto">
            Open in Chat
          </Link>
        </div>
        <div class="d-flex flex-wrap gap-3 mt-1">
          <span>
            <span class="text-body-secondary">Created:</span> {relativeTime(s.createdAt)}
          </span>
          <span>
            <span class="text-body-secondary">Last active:</span> {relativeTime(s.lastActiveAt)}
          </span>
        </div>
        <div class="d-flex flex-wrap gap-3 mt-1">
          <span>
            <span class="text-body-secondary">Input:</span> {fmtTokens(s.tokensIn)}
          </span>
          <span>
            <span class="text-body-secondary">Output:</span> {fmtTokens(s.tokensOut)}
          </span>
          {s.reasoningTokens > 0 && (
            <span>
              <span class="text-body-secondary">Reasoning:</span> {fmtTokens(s.reasoningTokens)}
            </span>
          )}
          {s.cachedTokens > 0 && (
            <span>
              <span class="text-body-secondary">Cached:</span> {fmtTokens(s.cachedTokens)}
            </span>
          )}
          {s.costUsd > 0 && (
            <span>
              <span class="text-body-secondary">Cost:</span> {fmtUsd(s.costUsd)}
            </span>
          )}
        </div>
      </div>

      {data.runs.length > 0 && (
        <div class="mb-2">
          <h6 class="text-body-secondary small mb-1">Delegation Runs ({data.runs.length})</h6>
          {data.runs.map((run) => (
            <SessionRunRow key={run.id} run={run} />
          ))}
        </div>
      )}

      <h6 class="text-body-secondary small mb-1">Transcript ({data.messages.length} messages)</h6>
      <SessionTranscript messages={data.messages} sessionModel={s.model} />
    </section>
  );
}
