import { useState } from "preact/hooks";
import { apiPost } from "../api_post.ts";

interface SoulCreateFormProps {
  onCreated: () => void;
}

export function SoulCreateForm({ onCreated }: SoulCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [essence, setEssence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost("/api/souls", { name, description, essence });
      setName("");
      setDescription("");
      setEssence("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create soul.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        class="card h-100 border-dashed d-flex align-items-center justify-content-center btn p-0"
        style="cursor: pointer; border-style: dashed; min-height: 160px;"
        onClick={() => setOpen(true)}
      >
        <div class="text-center text-muted">
          <div style="font-size: 2rem;">+</div>
          <small>Create New Soul</small>
        </div>
      </button>
    );
  }

  return (
    <div class="card h-100">
      <div class="card-body">
        <h6 class="card-title">New Soul</h6>
        <form onSubmit={handleSubmit}>
          <div class="mb-2">
            <input
              type="text"
              class="form-control form-control-sm"
              placeholder="Name"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <div class="mb-2">
            <textarea
              class="form-control form-control-sm"
              placeholder="Description (optional)"
              rows={2}
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          <div class="mb-2">
            <textarea
              class="form-control form-control-sm"
              placeholder="Essence (optional)"
              rows={2}
              value={essence}
              onInput={(e) => setEssence((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          {error && <div class="alert alert-danger py-1 px-2 small">{error}</div>}
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-info btn-sm" disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
