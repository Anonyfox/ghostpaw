import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type {
  QuestInfo,
  QuestListResponse,
  StorylineInfo,
  StorylineListResponse,
} from "../../shared/quest_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { QuestBulletinBoard } from "../components/quest_bulletin_board.tsx";
import { QuestCreateForm } from "../components/quest_create_form.tsx";
import { QuestDetail } from "../components/quest_detail.tsx";
import { QuestRow } from "../components/quest_row.tsx";
import { QuestToolbar } from "../components/quest_toolbar.tsx";
import { StorylineCard } from "../components/storyline_card.tsx";
import { StorylineCreateForm } from "../components/storyline_create_form.tsx";

type Tab = "quests" | "board" | "storylines";

const DEFAULT_EXCLUDE = "offered,done,failed,abandoned";

export function QuestsPage() {
  const [tab, setTab] = useState<Tab>("quests");
  const [quests, setQuests] = useState<QuestInfo[]>([]);
  const [storylines, setStorylines] = useState<StorylineInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showStorylineCreate, setShowStorylineCreate] = useState(false);

  const [query, setQuery] = useState("");
  const committedQuery = useRef("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [storylineFilter, setStorylineFilter] = useState("");

  const [boardQuests, setBoardQuests] = useState<QuestInfo[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardInput, setBoardInput] = useState("");

  const fetchStorylines = useCallback(() => {
    apiGet<StorylineListResponse>("/api/storylines")
      .then((res) => setStorylines(res.storylines))
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
    if (storylineFilter) params.set("storyline", storylineFilter);
    params.set("limit", "200");

    apiGet<QuestListResponse>(`/api/quests?${params}`)
      .then((res) => setQuests(res.quests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, priority, storylineFilter]);

  const fetchBoard = useCallback(() => {
    setBoardLoading(true);
    apiGet<QuestListResponse>("/api/quests?status=offered&limit=200")
      .then((res) => setBoardQuests(res.quests))
      .catch(() => {})
      .finally(() => setBoardLoading(false));
  }, []);

  useEffect(() => {
    fetchStorylines();
  }, [fetchStorylines]);
  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);
  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

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
    fetchStorylines();
    fetchBoard();
  }, [fetchQuests, fetchStorylines, fetchBoard]);

  const handleUpdated = useCallback(() => {
    fetchQuests();
    fetchStorylines();
    fetchBoard();
  }, [fetchQuests, fetchStorylines, fetchBoard]);

  const handleDone = useCallback(() => {
    fetchQuests();
    fetchStorylines();
    fetchBoard();
  }, [fetchQuests, fetchStorylines, fetchBoard]);

  const handleStorylineCreated = useCallback(() => {
    setShowStorylineCreate(false);
    fetchStorylines();
  }, [fetchStorylines]);

  const handleBoardQuickAdd = async () => {
    const title = boardInput.trim();
    if (!title) return;
    try {
      await apiPost<QuestInfo>("/api/quests", { title, status: "offered" });
      setBoardInput("");
      fetchBoard();
    } catch {
      /* ignore */
    }
  };

  const handleAccept = async (id: number, storylineId?: number) => {
    try {
      await apiPost(`/api/quests/${id}/accept`, storylineId ? { storylineId } : {});
      fetchBoard();
      fetchQuests();
      fetchStorylines();
    } catch {
      /* ignore */
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await apiPost(`/api/quests/${id}/dismiss`);
      fetchBoard();
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">Quests</h4>
        <ul class="nav nav-tabs mb-0">
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "quests" ? "active" : ""}`}
              onClick={() => setTab("quests")}
            >
              Quest Log
            </button>
          </li>
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "board" ? "active" : ""}`}
              onClick={() => setTab("board")}
            >
              Quest Board
              {boardQuests.length > 0 && (
                <span class="badge bg-warning text-dark ms-1">{boardQuests.length}</span>
              )}
            </button>
          </li>
          <li class="nav-item">
            <button
              type="button"
              class={`nav-link ${tab === "storylines" ? "active" : ""}`}
              onClick={() => setTab("storylines")}
            >
              Storylines ({storylines.length})
            </button>
          </li>
        </ul>
      </div>

      {tab === "quests" && (
        <div>
          <QuestBulletinBoard onQuestClick={handleQuestClick} boardCount={boardQuests.length} />

          <QuestToolbar
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            status={status}
            onStatusChange={(s) => {
              setStatus(s);
            }}
            priority={priority}
            onPriorityChange={(p) => {
              setPriority(p);
            }}
            storylineFilter={storylineFilter}
            onStorylineFilterChange={(l) => {
              setStorylineFilter(l);
            }}
            storylines={storylines}
            onAdd={() => setShowCreate(true)}
          />

          {showCreate && (
            <QuestCreateForm
              storylines={storylines}
              onCreated={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {loading ? (
            <div class="text-body-tertiary small">Loading quests...</div>
          ) : quests.length === 0 ? (
            <div class="text-body-tertiary text-center py-5">
              {committedQuery.current.trim()
                ? "No quests match your search."
                : "No active quests. Start your first quest!"}
              {!committedQuery.current.trim() && !showCreate && (
                <div class="mt-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-info"
                    onClick={() => setShowCreate(true)}
                  >
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
                    <QuestRow quest={q} isExpanded={expandedId === q.id} onToggle={handleToggle} />
                    {expandedId === q.id && (
                      <QuestDetail
                        questId={q.id}
                        storylines={storylines}
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
          storylines={storylines}
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
            <span class="text-body-tertiary small">
              {storylines.length} storyline{storylines.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              class="btn btn-sm btn-info"
              onClick={() => setShowStorylineCreate(true)}
            >
              + New Storyline
            </button>
          </div>
          <div class="row g-3">
            {storylines.map((s) => (
              <div class="col-md-6 col-lg-4" key={s.id}>
                <StorylineCard storyline={s} />
              </div>
            ))}
            {showStorylineCreate && (
              <div class="col-md-6 col-lg-4">
                <StorylineCreateForm
                  onCreated={handleStorylineCreated}
                  onCancel={() => setShowStorylineCreate(false)}
                />
              </div>
            )}
            {storylines.length === 0 && !showStorylineCreate && (
              <div class="col-12 text-body-tertiary text-center py-5">
                No storylines yet. Create your first storyline!
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
  storylines: StorylineInfo[];
  input: string;
  onInputChange: (v: string) => void;
  onQuickAdd: () => void;
  onAccept: (id: number, storylineId?: number) => void;
  onDismiss: (id: number) => void;
}

function BoardTab({
  quests,
  loading,
  storylines,
  input,
  onInputChange,
  onQuickAdd,
  onAccept,
  onDismiss,
}: BoardTabProps) {
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [acceptStorylineId, setAcceptStorylineId] = useState("");

  const confirmAccept = (id: number) => {
    const storylineId = acceptStorylineId ? Number(acceptStorylineId) : undefined;
    onAccept(id, storylineId);
    setAcceptingId(null);
    setAcceptStorylineId("");
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
            onKeyDown={(e) => {
              if (e.key === "Enter") onQuickAdd();
            }}
          />
        </div>
        <div class="text-body-tertiary small mt-1">Quick-add to the board. Sort it out later.</div>
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
            <div
              key={q.id}
              class="quest-board-row d-flex align-items-start gap-2 px-3 py-2 border-bottom"
            >
              <span
                class={`quest-board-icon mt-1 ${q.createdBy === "ghostpaw" ? "quest-board-icon-exclaim" : "quest-board-icon-question"}`}
              >
                {q.createdBy === "ghostpaw" ? "!" : "?"}
              </span>
              <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2">
                  <span class="fw-medium">{q.title}</span>
                  {q.priority !== "normal" && (
                    <span
                      class={`badge ${q.priority === "urgent" ? "bg-danger" : q.priority === "high" ? "bg-warning text-dark" : "bg-secondary"} rounded-pill`}
                    >
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
                    {storylines.length > 0 && (
                      <select
                        class="form-select form-select-sm"
                        style="max-width: 180px;"
                        value={acceptStorylineId}
                        onChange={(e) =>
                          setAcceptStorylineId((e.target as HTMLSelectElement).value)
                        }
                      >
                        <option value="">No storyline</option>
                        {storylines.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      class="btn btn-sm btn-success"
                      onClick={() => confirmAccept(q.id)}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      onClick={() => setAcceptingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {acceptingId !== q.id && (
                <div class="d-flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-success"
                    onClick={() => setAcceptingId(q.id)}
                    title="Accept quest"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    onClick={() => onDismiss(q.id)}
                    title="Dismiss quest"
                  >
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
