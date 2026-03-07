import { useState } from "preact/hooks";
import type { CreateQuestBody, QuestInfo, QuestLogInfo } from "../../shared/quest_types.ts";
import { apiPost } from "../api_post.ts";
import { RecurrencePicker } from "./quest_recurrence_picker.tsx";

interface Props {
  logs: QuestLogInfo[];
  onCreated: (q: QuestInfo) => void;
  onCancel: () => void;
}

export function QuestCreateForm({ logs, onCreated, onCancel }: Props) {
  const [form, setForm] = useState<CreateQuestBody>({ title: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const q = await apiPost<QuestInfo>("/api/quests", form);
      onCreated(q);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const fromLocal = (val: string): number | undefined => {
    if (!val) return undefined;
    return new Date(val).getTime();
  };

  return (
    <div class="border rounded p-3 mb-3 bg-body-tertiary">
      <h6 class="mb-2">New Quest</h6>
      {error && <div class="alert alert-danger py-1 small">{error}</div>}
      <div class="row g-2 mb-2">
        <div class="col-12">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="Quest title *"
            value={form.title}
            onInput={(e) => setForm({ ...form, title: (e.target as HTMLInputElement).value })}
            onKeyDown={onKeyDown}
          />
        </div>
        <div class="col-12">
          <textarea
            class="form-control form-control-sm"
            rows={2}
            placeholder="Description (optional)"
            value={form.description ?? ""}
            onInput={(e) =>
              setForm({
                ...form,
                description: (e.target as HTMLTextAreaElement).value || undefined,
              })
            }
          />
        </div>
        <div class="col-sm-4">
          <select
            class="form-select form-select-sm"
            value={form.priority ?? "normal"}
            onChange={(e) =>
              setForm({
                ...form,
                priority: (e.target as HTMLSelectElement).value as QuestInfo["priority"],
              })
            }
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div class="col-sm-4">
          <select
            class="form-select form-select-sm"
            value={String(form.questLogId ?? "")}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setForm({ ...form, questLogId: v ? Number(v) : undefined });
            }}
          >
            <option value="">No quest log</option>
            {logs.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.title}
              </option>
            ))}
          </select>
        </div>
        <div class="col-sm-4">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder="Tags"
            value={form.tags ?? ""}
            onInput={(e) =>
              setForm({ ...form, tags: (e.target as HTMLInputElement).value || undefined })
            }
          />
        </div>
        <div class="col-sm-6">
          <label htmlFor="quest-create-due" class="form-label small text-body-secondary mb-0">
            Due
          </label>
          <input
            id="quest-create-due"
            type="datetime-local"
            class="form-control form-control-sm"
            onInput={(e) =>
              setForm({ ...form, dueAt: fromLocal((e.target as HTMLInputElement).value) })
            }
          />
        </div>
        <div class="col-sm-6">
          <label htmlFor="quest-create-remind" class="form-label small text-body-secondary mb-0">
            Remind
          </label>
          <input
            id="quest-create-remind"
            type="datetime-local"
            class="form-control form-control-sm"
            onInput={(e) =>
              setForm({ ...form, remindAt: fromLocal((e.target as HTMLInputElement).value) })
            }
          />
        </div>
        <div class="col-sm-6">
          <label htmlFor="quest-create-starts" class="form-label small text-body-secondary mb-0">
            Starts
          </label>
          <input
            id="quest-create-starts"
            type="datetime-local"
            class="form-control form-control-sm"
            onInput={(e) =>
              setForm({ ...form, startsAt: fromLocal((e.target as HTMLInputElement).value) })
            }
          />
        </div>
        <div class="col-sm-6">
          <label htmlFor="quest-create-ends" class="form-label small text-body-secondary mb-0">
            Ends
          </label>
          <input
            id="quest-create-ends"
            type="datetime-local"
            class="form-control form-control-sm"
            onInput={(e) =>
              setForm({ ...form, endsAt: fromLocal((e.target as HTMLInputElement).value) })
            }
          />
        </div>
        <div class="col-12">
          <label htmlFor="quest-create-rrule" class="form-label small text-body-secondary mb-0">
            Recurrence
          </label>
          <RecurrencePicker
            value={form.rrule ?? null}
            onChange={(rrule) => setForm({ ...form, rrule: rrule ?? undefined })}
          />
        </div>
      </div>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-sm btn-info" onClick={submit} disabled={submitting}>
          {submitting ? "Creating..." : "Create Quest"}
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
