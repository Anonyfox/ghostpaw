import { useCallback, useEffect, useState } from "preact/hooks";
import type { QuestDetailResponse, QuestInfo, QuestLogInfo, UpdateQuestBody } from "../../shared/quest_types.ts";
import { relativeAge, relativeDue, rruleLabel } from "../../shared/quest_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPatch } from "../api_patch.ts";
import { apiPost } from "../api_post.ts";
import { RecurrencePicker } from "./quest_recurrence_picker.tsx";
import { QuestStatusPill } from "./quest_status_pill.tsx";

interface Props {
  questId: number;
  logs: QuestLogInfo[];
  onUpdated: (q: QuestInfo) => void;
  onDone: (id: number) => void;
}

function fmtDate(ts: number): string {
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

export function QuestDetail({ questId, logs, onUpdated, onDone }: Props) {
  const [detail, setDetail] = useState<QuestDetailResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateQuestBody>({});
  const [error, setError] = useState("");

  const load = useCallback(() => {
    apiGet<QuestDetailResponse>(`/api/quests/${questId}`)
      .then(setDetail)
      .catch(() => {});
  }, [questId]);

  useEffect(() => { load(); }, [load]);

  if (!detail) return <div class="px-3 py-2 text-body-tertiary small">Loading...</div>;

  const d = detail;
  const recurrence = rruleLabel(d.rrule);

  const startEdit = () => {
    setForm({
      title: d.title,
      description: d.description,
      status: d.status,
      priority: d.priority,
      questLogId: d.questLogId,
      tags: d.tags,
      dueAt: d.dueAt,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      remindAt: d.remindAt,
      rrule: d.rrule,
    });
    setEditing(true);
    setError("");
  };

  const saveEdit = async () => {
    try {
      const updated = await apiPatch<QuestInfo>(`/api/quests/${questId}`, form);
      setEditing(false);
      setError("");
      onUpdated(updated);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDone = async () => {
    try {
      await apiPost(`/api/quests/${questId}/done`);
      onDone(questId);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (editing) {
    return (
      <div class="px-3 py-3 bg-body-tertiary border-bottom">
        {error && <div class="alert alert-danger py-1 small">{error}</div>}
        <div class="row g-2 mb-2">
          <div class="col-12">
            <input type="text" class="form-control form-control-sm" placeholder="Title"
              value={form.title ?? ""} onInput={(e) => setForm({ ...form, title: (e.target as HTMLInputElement).value })} />
          </div>
          <div class="col-12">
            <textarea class="form-control form-control-sm" rows={2} placeholder="Description"
              value={form.description ?? ""} onInput={(e) => setForm({ ...form, description: (e.target as HTMLTextAreaElement).value || null })} />
          </div>
          <div class="col-sm-4">
            <select class="form-select form-select-sm" value={form.status ?? d.status}
              onChange={(e) => setForm({ ...form, status: (e.target as HTMLSelectElement).value as QuestInfo["status"] })}>
              <option value="offered">Offered</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div class="col-sm-4">
            <select class="form-select form-select-sm" value={form.priority ?? d.priority}
              onChange={(e) => setForm({ ...form, priority: (e.target as HTMLSelectElement).value as QuestInfo["priority"] })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="col-sm-4">
            <select class="form-select form-select-sm" value={String(form.questLogId ?? "")}
              onChange={(e) => { const v = (e.target as HTMLSelectElement).value; setForm({ ...form, questLogId: v ? Number(v) : null }); }}>
              <option value="">No quest log</option>
              {logs.map((l) => <option key={l.id} value={String(l.id)}>{l.title}</option>)}
            </select>
          </div>
          <div class="col-sm-6">
            <label class="form-label small text-body-secondary mb-0">Due</label>
            <input type="datetime-local" class="form-control form-control-sm"
              value={toLocalInput(form.dueAt ?? null)} onInput={(e) => setForm({ ...form, dueAt: fromLocalInput((e.target as HTMLInputElement).value) })} />
          </div>
          <div class="col-sm-6">
            <label class="form-label small text-body-secondary mb-0">Remind</label>
            <input type="datetime-local" class="form-control form-control-sm"
              value={toLocalInput(form.remindAt ?? null)} onInput={(e) => setForm({ ...form, remindAt: fromLocalInput((e.target as HTMLInputElement).value) })} />
          </div>
          <div class="col-sm-6">
            <label class="form-label small text-body-secondary mb-0">Starts</label>
            <input type="datetime-local" class="form-control form-control-sm"
              value={toLocalInput(form.startsAt ?? null)} onInput={(e) => setForm({ ...form, startsAt: fromLocalInput((e.target as HTMLInputElement).value) })} />
          </div>
          <div class="col-sm-6">
            <label class="form-label small text-body-secondary mb-0">Ends</label>
            <input type="datetime-local" class="form-control form-control-sm"
              value={toLocalInput(form.endsAt ?? null)} onInput={(e) => setForm({ ...form, endsAt: fromLocalInput((e.target as HTMLInputElement).value) })} />
          </div>
          <div class="col-sm-6">
            <input type="text" class="form-control form-control-sm" placeholder="Tags (comma-separated)"
              value={form.tags ?? ""} onInput={(e) => setForm({ ...form, tags: (e.target as HTMLInputElement).value || null })} />
          </div>
          <div class="col-sm-6">
            <label class="form-label small text-body-secondary mb-0">Recurrence</label>
            <RecurrencePicker
              value={form.rrule ?? null}
              onChange={(rrule) => setForm({ ...form, rrule: rrule })}
            />
          </div>
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-info" onClick={saveEdit}>Save</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div class="px-3 py-3 bg-body-tertiary border-bottom">
      {error && <div class="alert alert-danger py-1 small">{error}</div>}
      {d.description && <p class="small mb-2">{d.description}</p>}
      <dl class="row small mb-2">
        <dt class="col-sm-3 text-body-secondary">Status</dt>
        <dd class="col-sm-9"><QuestStatusPill status={d.status} /></dd>
        <dt class="col-sm-3 text-body-secondary">Priority</dt>
        <dd class="col-sm-9">{d.priority}</dd>
        {d.tags && <>
          <dt class="col-sm-3 text-body-secondary">Tags</dt>
          <dd class="col-sm-9">{d.tags}</dd>
        </>}
        {d.questLogId != null && <>
          <dt class="col-sm-3 text-body-secondary">Quest Log</dt>
          <dd class="col-sm-9">#{d.questLogId}</dd>
        </>}
        <dt class="col-sm-3 text-body-secondary">Created</dt>
        <dd class="col-sm-9">{fmtDate(d.createdAt)} ({relativeAge(d.createdAt)} ago) by {d.createdBy}</dd>
        <dt class="col-sm-3 text-body-secondary">Updated</dt>
        <dd class="col-sm-9">{fmtDate(d.updatedAt)} ({relativeAge(d.updatedAt)} ago)</dd>
        {d.startsAt != null && <>
          <dt class="col-sm-3 text-body-secondary">Starts</dt>
          <dd class="col-sm-9">{fmtDate(d.startsAt)}</dd>
        </>}
        {d.endsAt != null && <>
          <dt class="col-sm-3 text-body-secondary">Ends</dt>
          <dd class="col-sm-9">{fmtDate(d.endsAt)}</dd>
        </>}
        {d.dueAt != null && <>
          <dt class="col-sm-3 text-body-secondary">Due</dt>
          <dd class="col-sm-9">{fmtDate(d.dueAt)} ({relativeDue(d.dueAt)})</dd>
        </>}
        {d.remindAt != null && <>
          <dt class="col-sm-3 text-body-secondary">Remind</dt>
          <dd class="col-sm-9">{fmtDate(d.remindAt)}</dd>
        </>}
        {d.completedAt != null && <>
          <dt class="col-sm-3 text-body-secondary">Completed</dt>
          <dd class="col-sm-9">{fmtDate(d.completedAt)} ({relativeAge(d.completedAt)} ago)</dd>
        </>}
        {recurrence && <>
          <dt class="col-sm-3 text-body-secondary">Recurrence</dt>
          <dd class="col-sm-9">{recurrence} <span class="text-body-tertiary">({d.rrule})</span></dd>
        </>}
      </dl>

      {d.occurrences.length > 0 && (
        <div class="mb-2">
          <div class="small fw-semibold text-body-secondary mb-1">Recent Occurrences</div>
          <div class="border rounded">
            {d.occurrences.map((o) => (
              <div key={o.id} class="d-flex gap-2 px-2 py-1 border-bottom small">
                <span class="text-body-tertiary">#{o.id}</span>
                <span>{fmtDate(o.occurrenceAt)}</span>
                <span class={o.status === "skipped" ? "text-warning" : "text-success"}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div class="d-flex gap-2">
        <button type="button" class="btn btn-sm btn-outline-info" onClick={startEdit}>Edit</button>
        {!["offered", "done", "failed", "cancelled"].includes(d.status) && (
          <button type="button" class="btn btn-sm btn-success" onClick={handleDone}>Done</button>
        )}
      </div>
    </div>
  );
}
