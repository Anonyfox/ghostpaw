import { useState } from "preact/hooks";
import { apiPost } from "../api_post.ts";

interface PackMeetFormProps {
  onCreated: () => void;
}

const KINDS = ["human", "agent", "ghostpaw", "service", "other"];

export function PackMeetForm({ onCreated }: PackMeetFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("human");
  const [bond, setBond] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost("/api/pack", {
        name,
        kind,
        bond: bond || undefined,
      });
      setName("");
      setKind("human");
      setBond("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to meet new member.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        class="card h-100 d-flex align-items-center justify-content-center btn border-secondary p-0"
        style="cursor: pointer; border-style: dashed !important; min-height: 160px;"
        onClick={() => setOpen(true)}
      >
        <div class="text-center text-body-secondary">
          <div style="font-size: 2rem;">+</div>
          <small>Meet Someone New</small>
        </div>
      </button>
    );
  }

  return (
    <div class="card h-100">
      <div class="card-body">
        <h6 class="card-title">New Confidant</h6>
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
            <select
              class="form-select form-select-sm"
              value={kind}
              onChange={(e) => setKind((e.target as HTMLSelectElement).value)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div class="mb-2">
            <textarea
              class="form-control form-control-sm"
              placeholder="Bond narrative (optional)"
              rows={2}
              value={bond}
              onInput={(e) => setBond((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          {error && <div class="alert alert-danger py-1 px-2 small">{error}</div>}
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-info btn-sm" disabled={saving}>
              {saving ? "Meeting..." : "Meet"}
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
