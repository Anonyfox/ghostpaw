import { useState } from "preact/hooks";
import type { CreateStorylineBody, StorylineInfo } from "../../shared/quest_types.ts";
import { apiPost } from "../api_post.ts";

interface Props {
  onCreated: (storyline: StorylineInfo) => void;
  onCancel: () => void;
}

export function StorylineCreateForm({ onCreated, onCancel }: Props) {
  const [form, setForm] = useState<CreateStorylineBody>({ title: "" });
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
      const storyline = await apiPost<StorylineInfo>("/api/storylines", form);
      onCreated(storyline);
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
    <div class="card border h-100">
      <div class="card-body">
        <h6 class="card-title mb-2">New Storyline</h6>
        {error && <div class="alert alert-danger py-1 small">{error}</div>}
        <input
          type="text"
          class="form-control form-control-sm mb-2"
          placeholder="Title *"
          value={form.title}
          onInput={(e) => setForm({ ...form, title: (e.target as HTMLInputElement).value })}
          onKeyDown={onKeyDown}
        />
        <textarea
          class="form-control form-control-sm mb-2"
          rows={2}
          placeholder="Description"
          value={form.description ?? ""}
          onInput={(e) =>
            setForm({ ...form, description: (e.target as HTMLTextAreaElement).value || undefined })
          }
        />
        <div class="mb-2">
          <label
            htmlFor="storyline-create-deadline"
            class="form-label small text-body-secondary mb-0"
          >
            Deadline
          </label>
          <input
            id="storyline-create-deadline"
            type="datetime-local"
            class="form-control form-control-sm"
            onInput={(e) =>
              setForm({ ...form, dueAt: fromLocal((e.target as HTMLInputElement).value) })
            }
          />
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-info" onClick={submit} disabled={submitting}>
            {submitting ? "Creating..." : "Create"}
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
