import { useCallback, useEffect, useState } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import type {
  QuestInfo,
  StorylineDetailResponse,
  StorylineInfo,
  StorylineListResponse,
  UpdateStorylineBody,
} from "../../shared/quest_types.ts";
import { relativeAge, relativeDue } from "../../shared/quest_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPatch } from "../api_patch.ts";
import { apiPost } from "../api_post.ts";
import { QuestDetail } from "../components/quest_detail.tsx";
import { QuestRow } from "../components/quest_row.tsx";
import { QuestStatusPill } from "../components/quest_status_pill.tsx";

function _fmtDate(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").slice(0, 16);
}

function toLocalInput(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 16);
}

function fromLocalInput(val: string): number | null {
  if (!val) return null;
  return new Date(val).getTime();
}

export function StorylineDetailPage() {
  const { id } = useParams();
  const storylineId = Number(id);
  const [detail, setDetail] = useState<StorylineDetailResponse | null>(null);
  const [storylines, setStorylines] = useState<StorylineInfo[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateStorylineBody>({});
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiGet<StorylineDetailResponse>(`/api/storylines/${storylineId}`)
      .then(setDetail)
      .catch(() => {});
    apiGet<StorylineListResponse>("/api/storylines")
      .then((res) => setStorylines(res.storylines))
      .catch(() => {});
  }, [storylineId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!detail) return <div class="text-body-tertiary small">Loading...</div>;

  const d = detail;
  const { progress } = d;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const startEdit = () => {
    setForm({ title: d.title, description: d.description, status: d.status, dueAt: d.dueAt });
    setEditing(true);
    setError("");
  };

  const saveEdit = async () => {
    try {
      await apiPatch(`/api/storylines/${storylineId}`, form);
      setEditing(false);
      setError("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDone = async () => {
    try {
      await apiPost(`/api/storylines/${storylineId}/done`);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <Link
        href="/quests"
        class="text-body-secondary small text-decoration-none mb-2 d-inline-block"
      >
        &larr; All Quests
      </Link>

      <div class="d-flex justify-content-between align-items-start mb-3">
        <h4 class="mb-0">{d.title}</h4>
        <QuestStatusPill status={d.status} />
      </div>

      {error && <div class="alert alert-danger py-1 small">{error}</div>}

      {editing ? (
        <div class="border rounded p-3 bg-body-tertiary mb-3">
          <div class="row g-2 mb-2">
            <div class="col-12">
              <input
                type="text"
                class="form-control form-control-sm"
                placeholder="Title"
                value={form.title ?? ""}
                onInput={(e) => setForm({ ...form, title: (e.target as HTMLInputElement).value })}
              />
            </div>
            <div class="col-12">
              <textarea
                class="form-control form-control-sm"
                rows={2}
                placeholder="Description"
                value={form.description ?? ""}
                onInput={(e) =>
                  setForm({ ...form, description: (e.target as HTMLTextAreaElement).value || null })
                }
              />
            </div>
            <div class="col-sm-6">
              <select
                class="form-select form-select-sm"
                value={form.status ?? d.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: (e.target as HTMLSelectElement)
                      .value as StorylineDetailResponse["status"],
                  })
                }
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div class="col-sm-6">
              <label
                htmlFor="storyline-edit-deadline"
                class="form-label small text-body-secondary mb-0"
              >
                Deadline
              </label>
              <input
                id="storyline-edit-deadline"
                type="datetime-local"
                class="form-control form-control-sm"
                value={toLocalInput(form.dueAt ?? null)}
                onInput={(e) =>
                  setForm({ ...form, dueAt: fromLocalInput((e.target as HTMLInputElement).value) })
                }
              />
            </div>
          </div>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-sm btn-info" onClick={saveEdit}>
              Save
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {d.description && <p class="text-body-secondary small mb-2">{d.description}</p>}

          <div class="progress quest-progress-bar mb-2" style="height: 12px;">
            <div
              class="progress-bar bg-info"
              role="progressbar"
              style={`width: ${pct}%`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div class="d-flex flex-wrap gap-3 small text-body-secondary mb-3">
            <span>
              {progress.done}/{progress.total} done ({pct}%)
            </span>
            {progress.active > 0 && <span>{progress.active} active</span>}
            {progress.accepted > 0 && <span>{progress.accepted} accepted</span>}
            {progress.blocked > 0 && <span class="text-warning">{progress.blocked} blocked</span>}
            {d.dueAt && (
              <span class={d.dueAt < Date.now() ? "text-danger" : ""}>{relativeDue(d.dueAt)}</span>
            )}
            <span>
              Created {relativeAge(d.createdAt)} ago by {d.createdBy}
            </span>
          </div>

          <div class="d-flex gap-2 mb-3">
            <button type="button" class="btn btn-sm btn-outline-info" onClick={startEdit}>
              Edit
            </button>
            {d.status === "active" && (
              <button type="button" class="btn btn-sm btn-success" onClick={handleDone}>
                Mark Complete
              </button>
            )}
          </div>
        </div>
      )}

      <h6 class="text-body-secondary mb-2">Quests in this storyline ({d.quests.length})</h6>
      {d.quests.length === 0 ? (
        <div class="text-body-tertiary small">No quests in this storyline yet.</div>
      ) : (
        <div class="border rounded">
          {d.quests.map((q: QuestInfo) => (
            <div key={q.id}>
              <QuestRow
                quest={q}
                isExpanded={expandedId === q.id}
                onToggle={(qid) => setExpandedId(expandedId === qid ? null : qid)}
              />
              {expandedId === q.id && (
                <QuestDetail
                  questId={q.id}
                  storylines={storylines}
                  onUpdated={() => load()}
                  onDone={() => load()}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
