import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { QuestInfo, QuestListResponse, QuestLogInfo, QuestLogListResponse } from "../../shared/quest_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { QuestBulletinBoard } from "../components/quest_bulletin_board.tsx";
import { QuestCreateForm } from "../components/quest_create_form.tsx";
import { QuestDetail } from "../components/quest_detail.tsx";
import { QuestLogCard } from "../components/quest_log_card.tsx";
import { QuestLogCreateForm } from "../components/quest_log_create_form.tsx";
import { QuestRow } from "../components/quest_row.tsx";
import { QuestToolbar } from "../components/quest_toolbar.tsx";

type Tab = "quests" | "board" | "storylines";

const DEFAULT_EXCLUDE = "offered,done,failed,cancelled";

export function QuestsPage() {
  const [tab, setTab] = useState<Tab>("quests");
  const [quests, setQuests] = useState<QuestInfo[]>([]);
  const [logs, setLogs] = useState<QuestLogInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showLogCreate, setShowLogCreate] = useState(false);

  const [query, setQuery] = useState("");
  const committedQuery = useRef("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [logFilter, setLogFilter] = useState("");

  const [boardQuests, setBoardQuests] = useState<QuestInfo[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardInput, setBoardInput] = useState("");

  const fetchLogs = useCallback(() => {
    apiGet<QuestLogListResponse>("/api/quest-logs")
      .then((res) => setLogs(res.logs))
      .catch(() => {});
  }, []);

  const fetchQuests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (committedQuery.current.trim()) params.set("query", committedQuery.current.trim());
    if (status) {
      if (status === "__all") {
        // no exclude, no status filter
      } else {
        params.set("status", status);
      }
    } else {
      params.set("exclude", DEFAULT_EXCLUDE);
    }
    if (priority) params.set("priority", priority);
    if (logFilter) params.set("log", logFilter);
    params.set("limit", "200");

    apiGet<QuestListResponse>(`/api/quests?${params}`)
      .then((res) => setQuests(res.quests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, priority, logFilter]);

  const fetchBoard = useCallback(() => {
    setBoardLoading(true);
    apiGet<QuestListResponse>("/api/quests?status=offered&limit=200")
      .then((res) => setBoardQuests(res.quests))
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchQuests(); }, [fetchQuests]);
  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleSearch = () => {
    committedQuery.current = query;
    fetchQuests();
  };

  const handleToggle = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleQuestClick = useCallback((id: number) => {
    setTab("quests");
    setExpandedId(id);
  }, []);

  const handleCreated = useCallback(() => {
    setShowCreate(false);
    fetchQuests();
    fetchLogs();
    fetchBoard();
  }, [fetchQuests, fetchLogs, fetchBoard]);

  const handleUpdated = useCallback(() => {
    fetchQuests();
    fetchLogs();
    fetchBoard();
  }, [fetchQuests, fetchLogs, fetchBoard]);

  const handleDone = useCallback(() => {
    fetchQuests();
    fetchLogs();
    fetchBoard();
  }, [fetchQuests, fetchLogs, fetchBoard]);

  const handleLogCreated = useCallback(() => {
    setShowLogCreate(false);
    fetchLogs();
  }, [fetchLogs]);

  const handleBoardQuickAdd = async () => {
    const title = boardInput.trim();
    if (!title) return;
    try {
      await apiPost<QuestInfo>("/api/quests", { title, status: "offered" });
      setBoardInput("");
      fetchBoard();
    } catch { /* ignore */ }
  };

  const handleAccept = async (id: number, questLogId?: number) => {
    try {
      await apiPost(`/api/quests/${id}/accept`, questLogId ? { questLogId } : {});
      fetchBoard();
      fetchQuests();
      fetchLogs();
    } catch { /* ignore */ }
  };

  const handleDismiss = async (id: number) => {
    try {
      await apiPost(`/api/quests/${id}/dismiss`);
      fetchBoard();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">Quests</h4>
        <ul class="nav nav-tabs mb-0">
          <li class="nav-item">
            <button type="button" class={`nav-link ${tab === "quests" ? "active" : ""}`}
              onClick={() => setTab("quests")}>
              Quest Log
            </button>
          </li>
          <li class="nav-item">
            <button type="button" class={`nav-link ${tab === "board" ? "active" : ""}`}
              onClick={() => setTab("board")}>
              Quest Board
              {boardQuests.length > 0 && (
                <span class="badge bg-warning text-dark ms-1">{boardQuests.length}</span>
              )}
            </button>
          </li>
          <li class="nav-item">
            <button type="button" class={`nav-link ${tab === "storylines" ? "active" : ""}`}
              onClick={() => setTab("storylines")}>
              Storylines ({logs.length})
            </button>
          </li>
        </ul>
      </div>

      {tab === "quests" && (
        <div>
          <QuestBulletinBoard onQuestClick={handleQuestClick} boardCount={boardQuests.length} />

          <QuestToolbar
            query={query} onQueryChange={setQuery} onSearch={handleSearch}
            status={status} onStatusChange={(s) => { setStatus(s); }}
            priority={priority} onPriorityChange={(p) => { setPriority(p); }}
            logFilter={logFilter} onLogFilterChange={(l) => { setLogFilter(l); }}
            logs={logs}
            onAdd={() => setShowCreate(true)}
          />

          {showCreate && (
            <QuestCreateForm
              logs={logs}
              onCreated={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {loading ? (
            <div class="text-body-tertiary small">Loading quests...</div>
          ) : quests.length === 0 ? (
            <div class="text-body-tertiary text-center py-5">
              {committedQuery.current.trim() ? "No quests match your search." : "No active quests. Start your first quest!"}
              {!committedQuery.current.trim() && !showCreate && (
                <div class="mt-2">
                  <button type="button" class="btn btn-sm btn-info" onClick={() => setShowCreate(true)}>
                    + New Quest
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div class="text-body-tertiary small mb-2">
                {quests.length} quest{quests.length !== 1 ? "s" : ""}
              </div>
              <div class="border rounded">
                {quests.map((q) => (
                  <div key={q.id}>
                    <QuestRow
                      quest={q}
                      isExpanded={expandedId === q.id}
                      onToggle={handleToggle}
                    />
                    {expandedId === q.id && (
                      <QuestDetail
                        questId={q.id}
                        logs={logs}
                        onUpdated={handleUpdated}
                        onDone={handleDone}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "board" && (
        <BoardTab
          quests={boardQuests}
          loading={boardLoading}
          logs={logs}
          input={boardInput}
          onInputChange={setBoardInput}
          onQuickAdd={handleBoardQuickAdd}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />
      )}

      {tab === "storylines" && (
        <div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="text-body-tertiary small">{logs.length} quest log{logs.length !== 1 ? "s" : ""}</span>
            <button type="button" class="btn btn-sm btn-info" onClick={() => setShowLogCreate(true)}>
              + New Quest Log
            </button>
          </div>
          <div class="row g-3">
            {logs.map((l) => (
              <div class="col-md-6 col-lg-4" key={l.id}>
                <QuestLogCard log={l} />
              </div>
            ))}
            {showLogCreate && (
              <div class="col-md-6 col-lg-4">
                <QuestLogCreateForm
                  onCreated={handleLogCreated}
                  onCancel={() => setShowLogCreate(false)}
                />
              </div>
            )}
            {logs.length === 0 && !showLogCreate && (
              <div class="col-12 text-body-tertiary text-center py-5">
                No quest logs yet. Create your first storyline!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface BoardTabProps {
  quests: QuestInfo[];
  loading: boolean;
  logs: QuestLogInfo[];
  input: string;
  onInputChange: (v: string) => void;
  onQuickAdd: () => void;
  onAccept: (id: number, questLogId?: number) => void;
  onDismiss: (id: number) => void;
}

function BoardTab({ quests, loading, logs, input, onInputChange, onQuickAdd, onAccept, onDismiss }: BoardTabProps) {
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptLogId, setAcceptLogId] = useState("");

  const confirmAccept = (id: number) => {
    const logId = acceptLogId ? Number(acceptLogId) : undefined;
    onAccept(id, logId);
    setAcceptingId(null);
    setAcceptLogId("");
  };

  return (
    <div>
      <div class="quest-board-quickadd p-3 mb-3">
        <div class="d-flex gap-2 align-items-center">
          <span class="quest-board-icon quest-board-icon-question">?</span>
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="Drop an idea here... press Enter"
            value={input}
            onInput={(e) => onInputChange((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === "Enter") onQuickAdd(); }}
          />
        </div>
        <div class="text-body-tertiary small mt-1">
          Quick-add to the board. Sort it out later.
        </div>
      </div>

      {loading ? (
        <div class="text-body-tertiary small">Loading board...</div>
      ) : quests.length === 0 ? (
        <div class="text-body-tertiary text-center py-5">
          No quests on the board. Drop ideas here or let the ghost propose some.
        </div>
      ) : (
        <div class="border rounded">
          {quests.map((q) => (
            <div key={q.id} class="quest-board-row d-flex align-items-start gap-2 px-3 py-2 border-bottom">
              <span class={`quest-board-icon mt-1 ${q.createdBy === "ghost" ? "quest-board-icon-exclaim" : "quest-board-icon-question"}`}>
                {q.createdBy === "ghost" ? "!" : "?"}
              </span>
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2">
                  <span class="fw-medium">{q.title}</span>
                  {q.priority !== "normal" && (
                    <span class={`badge ${q.priority === "urgent" ? "bg-danger" : q.priority === "high" ? "bg-warning text-dark" : "bg-secondary"} rounded-pill`}>
                      {q.priority}
                    </span>
                  )}
                  <span class="text-body-tertiary small ms-auto">{q.createdBy}</span>
                </div>
                {q.description && (
                  <div class="text-body-secondary small text-truncate" style="max-width: 400px;">
                    {q.description}
                  </div>
                )}
                {q.dueAt && (
                  <div class="text-body-tertiary small">
                    Due: {new Date(q.dueAt).toLocaleDateString()}
                  </div>
                )}

                {acceptingId === q.id && (
                  <div class="d-flex gap-2 align-items-center mt-1">
                    {logs.length > 0 && (
                      <select
                        class="form-select form-select-sm"
                        style="max-width: 180px;"
                        value={acceptLogId}
                        onChange={(e) => setAcceptLogId((e.target as HTMLSelectElement).value)}
                      >
                        <option value="">No quest log</option>
                        {logs.map((l) => (
                          <option key={l.id} value={String(l.id)}>{l.title}</option>
                        ))}
                      </select>
                    )}
                    <button type="button" class="btn btn-sm btn-success" onClick={() => confirmAccept(q.id)}>
                      Confirm
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => setAcceptingId(null)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {acceptingId !== q.id && (
                <div class="d-flex gap-1 flex-shrink-0">
                  <button type="button" class="btn btn-sm btn-outline-success" onClick={() => setAcceptingId(q.id)}
                    title="Accept quest">
                    Accept
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => onDismiss(q.id)}
                    title="Dismiss quest">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
