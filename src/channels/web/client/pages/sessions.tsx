import { useCallback, useEffect, useState } from "preact/hooks";
import type {
  SessionInfo,
  SessionListResponse,
  SessionStatsResponse,
} from "../../shared/session_types.ts";
import { SessionDetail } from "../components/session_detail.tsx";
import { SessionFilterBar } from "../components/session_filter_bar.tsx";
import { SessionRow } from "../components/session_row.tsx";
import { SessionStatsBar } from "../components/session_stats_bar.tsx";

const LIST_LIMIT = 50;

export function SessionsPage() {
  const [stats, setStats] = useState<SessionStatsResponse | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const loadStats = () => {
    fetch("/api/sessions/stats")
      .then((r) => r.json())
      .then((d) => setStats(d as SessionStatsResponse))
      .catch(() => {});
  };

  const loadSessions = useCallback(
    (currentOffset: number, append = false) => {
      const params = new URLSearchParams();
      if (channel) params.set("channel", channel);
      if (status) params.set("status", status);
      if (purpose) params.set("purpose", purpose);
      params.set("sort", sort);
      if (search) params.set("search", search);
      params.set("limit", String(LIST_LIMIT));
      params.set("offset", String(currentOffset));

      fetch(`/api/sessions?${params}`)
        .then((r) => r.json())
        .then((d) => {
          const resp = d as SessionListResponse;
          setSessions((prev) => (append ? [...prev, ...resp.sessions] : resp.sessions));
          setTotal(resp.total);
        })
        .catch((e) => setError(String(e)));
    },
    [channel, status, purpose, sort, search],
  );

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    setOffset(0);
    setExpandedId(null);
    loadSessions(0);
  }, [loadSessions]);

  const handleLoadMore = () => {
    const next = offset + LIST_LIMIT;
    setOffset(next);
    loadSessions(next, true);
  };

  const handlePrune = async () => {
    try {
      const resp = await fetch("/api/sessions/prune", { method: "POST" });
      const data = (await resp.json()) as { pruned: number };
      if (data.pruned > 0) {
        loadStats();
        loadSessions(0);
        setOffset(0);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  if (error) return <p class="text-danger">{error}</p>;

  return (
    <div style="max-width: 900px;">
      <h4 class="mb-4">Sessions</h4>

      {stats && <SessionStatsBar stats={stats} />}

      <SessionFilterBar
        stats={stats}
        channel={channel}
        status={status}
        purpose={purpose}
        sort={sort}
        search={search}
        onChannelChange={setChannel}
        onStatusChange={setStatus}
        onPurposeChange={setPurpose}
        onSortChange={setSort}
        onSearchChange={setSearch}
        onPrune={handlePrune}
      />

      {sessions.length === 0 && <p class="text-body-tertiary">No sessions found.</p>}

      <div class="border rounded">
        {sessions.map((s) => (
          <div key={s.id} id={`session-${s.id}`}>
            <SessionRow
              session={s}
              expanded={expandedId === s.id}
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            />
            {expandedId === s.id && (
              <div class="p-3 border-bottom bg-body-tertiary">
                <SessionDetail sessionId={s.id} />
              </div>
            )}
          </div>
        ))}
      </div>

      {sessions.length < total && (
        <div class="text-center mt-3">
          <button type="button" class="btn btn-sm btn-outline-info" onClick={handleLoadMore}>
            Load more ({total - sessions.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
