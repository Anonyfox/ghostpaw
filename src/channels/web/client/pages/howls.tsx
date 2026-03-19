import { useCallback, useEffect, useState } from "preact/hooks";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { RenderMarkdown } from "../components/render_markdown.tsx";
import { relativeTime } from "../relative_time.ts";

interface HowlSummary {
  id: number;
  sessionId: number;
  message: string;
  urgency: "low" | "high";
  status: "pending" | "responded" | "dismissed";
  channel: string | null;
  deliveryMode: "push" | "inbox" | null;
  createdAt: number;
}

interface HowlDetail {
  id: number;
  sessionId: number;
  originSessionId: number;
  originMessageId: number | null;
  message: string;
  urgency: "low" | "high";
  channel: string | null;
  deliveryAddress: string | null;
  deliveryMessageId: string | null;
  deliveryMode: "push" | "inbox" | null;
  status: "pending" | "responded" | "dismissed";
  createdAt: number;
  respondedAt: number | null;
  responseMessageId: number | null;
}

interface HistoryMessage {
  id: number;
  role: string;
  content: string;
  createdAt: number;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === "high") {
    return <span class="badge bg-danger ms-2">urgent</span>;
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "pending"
      ? "bg-info text-dark"
      : status === "responded"
        ? "bg-success"
        : "bg-secondary";
  return <span class={`badge ${cls}`}>{status}</span>;
}

function PendingHowlCard({
  howl,
  onReplied,
  onDismissed,
}: {
  howl: HowlSummary;
  onReplied: () => void;
  onDismissed: () => void;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiPost<{ summary: string }>(`/api/howls/${howl.id}/reply`, {
        message: reply.trim(),
      });
      setResponse(res.summary);
      setReply("");
      onReplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }, [reply, sending, howl.id, onReplied]);

  const handleDismiss = useCallback(async () => {
    try {
      await apiPost(`/api/howls/${howl.id}/dismiss`);
      onDismissed();
    } catch {
      /* non-fatal */
    }
  }, [howl.id, onDismissed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div class="card border-info mb-3 howl-card-pending">
      <div class="card-body">
        <div class="d-flex align-items-start gap-3">
          <div class="howl-avatar flex-shrink-0">
            <span class="howl-ghost-icon" title="Ghostpaw reached out">
              &#x1F43E;
            </span>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-2">
              <strong class="text-info">Ghostpaw</strong>
              <UrgencyBadge urgency={howl.urgency} />
              <span class="text-muted small ms-auto">{relativeTime(howl.createdAt)}</span>
            </div>
            <div class="howl-message mb-3">
              <RenderMarkdown content={howl.message} />
            </div>

            {response ? (
              <div class="howl-response mt-3 p-3 bg-body-secondary rounded">
                <div class="text-muted small mb-1">Noted:</div>
                <RenderMarkdown content={response} />
              </div>
            ) : (
              <>
                <div class="input-group">
                  <textarea
                    class="form-control"
                    rows={2}
                    placeholder="Type your reply..."
                    value={reply}
                    onInput={(e) => setReply((e.target as HTMLTextAreaElement).value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                  />
                  <button
                    type="button"
                    class="btn btn-info"
                    onClick={handleSend}
                    disabled={!reply.trim() || sending}
                  >
                    {sending ? <span class="spinner-border spinner-border-sm" /> : "Reply"}
                  </button>
                </div>
                <div class="mt-2 text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    onClick={handleDismiss}
                  >
                    Dismiss
                  </button>
                </div>
                {error && <div class="alert alert-danger mt-2 py-1 px-2 small">{error}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResolvedHowlRow({
  howl,
  onSelect,
}: {
  howl: HowlSummary;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      type="button"
      class="d-flex align-items-center gap-2 py-2 px-2 howl-history-row btn border-0 w-100 text-start"
      onClick={() => onSelect(howl.id)}
    >
      <StatusBadge status={howl.status} />
      <span class="text-truncate flex-grow-1">{howl.message}</span>
      {howl.channel && (
        <span class="badge bg-body-secondary text-body-secondary">{howl.channel}</span>
      )}
      <span class="text-muted small flex-shrink-0">{relativeTime(howl.createdAt)}</span>
    </button>
  );
}

function HowlHistoryDetail({ howlId, onBack }: { howlId: number; onBack: () => void }) {
  const [howl, setHowl] = useState<HowlDetail | null>(null);
  const [sessionMessages, setSessionMessages] = useState<HistoryMessage[]>([]);
  const [originMessages, setOriginMessages] = useState<HistoryMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet<{
      howl: HowlDetail;
      sessionMessages: HistoryMessage[];
      originMessages: HistoryMessage[];
    }>(`/api/howls/${howlId}/history`)
      .then((data) => {
        setHowl(data.howl);
        setSessionMessages(data.sessionMessages);
        setOriginMessages(data.originMessages);
      })
      .finally(() => setLoading(false));
  }, [howlId]);

  if (loading) {
    return (
      <div class="text-center py-4">
        <span class="spinner-border spinner-border-sm" />
      </div>
    );
  }

  if (!howl) {
    return <div class="text-muted">Howl not found.</div>;
  }

  return (
    <div>
      <button type="button" class="btn btn-sm btn-outline-secondary mb-3" onClick={onBack}>
        &larr; Back
      </button>
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex align-items-center gap-2 mb-2">
            <strong>Howl #{howl.id}</strong>
            <StatusBadge status={howl.status} />
            <UrgencyBadge urgency={howl.urgency} />
            {howl.channel && (
              <span class="badge bg-body-secondary text-body-secondary">{howl.channel}</span>
            )}
            <span class="text-muted small ms-auto">{relativeTime(howl.createdAt)}</span>
          </div>
          <RenderMarkdown content={howl.message} />
          <div class="text-muted small mt-2">
            Howl session #{howl.sessionId} · Origin session #{howl.originSessionId}
          </div>
        </div>
      </div>
      {sessionMessages.length > 0 && (
        <div class="mb-4">
          <div class="text-muted small mb-2">Howl thread:</div>
          <div class="ms-4">
            {sessionMessages
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((m) => (
                <div
                  key={m.id}
                  class={`mb-2 p-2 rounded ${m.role === "user" ? "bg-body-secondary" : ""}`}
                >
                  <div class="text-muted small mb-1">
                    {m.role === "user" ? "You" : "Ghostpaw"} &middot; {relativeTime(m.createdAt)}
                  </div>
                  <RenderMarkdown content={m.content} />
                </div>
              ))}
          </div>
        </div>
      )}
      {originMessages.length > 0 && (
        <div class="ms-4">
          <div class="text-muted small mb-2">Origin session context:</div>
          {originMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => (
              <div
                key={m.id}
                class={`mb-2 p-2 rounded ${m.role === "user" ? "bg-body-secondary" : ""}`}
              >
                <div class="text-muted small mb-1">
                  {m.role === "user" ? "You" : "Ghostpaw"} &middot; {relativeTime(m.createdAt)}
                </div>
                <RenderMarkdown content={m.content} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function HowlsPage() {
  const [pendingHowls, setPendingHowls] = useState<HowlSummary[]>([]);
  const [resolvedHowls, setResolvedHowls] = useState<HowlSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchHowls = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiGet<HowlSummary[]>("/api/howls?status=pending"),
      apiGet<HowlSummary[]>("/api/howls?limit=20"),
    ])
      .then(([pending, all]) => {
        setPendingHowls(pending);
        setResolvedHowls(all.filter((h) => h.status !== "pending"));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchHowls();
  }, [fetchHowls]);

  if (selectedId !== null) {
    return (
      <div class="container-fluid py-3" style="max-width: 720px;">
        <HowlHistoryDetail howlId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div class="container-fluid py-3" style="max-width: 720px;">
      <h5 class="mb-3 d-flex align-items-center gap-2">
        <span>&#x1F43E;</span> Howls
        {pendingHowls.length > 0 && (
          <span class="badge bg-info">{pendingHowls.length} pending</span>
        )}
      </h5>

      {loading ? (
        <div class="text-center py-4">
          <span class="spinner-border" />
        </div>
      ) : (
        <>
          {pendingHowls.length === 0 && resolvedHowls.length === 0 && (
            <div class="text-muted text-center py-5">
              <div style="font-size: 2rem; opacity: 0.3;">&#x1F43E;</div>
              <p class="mt-2">No howls yet. The ghost hasn't reached out.</p>
            </div>
          )}

          {pendingHowls.length > 0 && (
            <div class="mb-4">
              {pendingHowls.map((h) => (
                <PendingHowlCard
                  key={h.id}
                  howl={h}
                  onReplied={fetchHowls}
                  onDismissed={fetchHowls}
                />
              ))}
            </div>
          )}

          {resolvedHowls.length > 0 && (
            <div>
              <h6 class="text-muted mb-2">History</h6>
              <div class="list-group list-group-flush">
                {resolvedHowls.map((h) => (
                  <ResolvedHowlRow key={h.id} howl={h} onSelect={setSelectedId} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
