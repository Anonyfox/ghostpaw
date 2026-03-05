import { useState } from "preact/hooks";
import { apiPost } from "../api_post.ts";

interface PackNoteFormProps {
  memberId: number;
  onNoted: () => void;
}

const INTERACTION_KINDS = [
  "conversation",
  "correction",
  "conflict",
  "gift",
  "milestone",
  "observation",
];

export function PackNoteForm({ memberId, onNoted }: PackNoteFormProps) {
  const [kind, setKind] = useState("conversation");
  const [summary, setSummary] = useState("");
  const [significance, setSignificance] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost(`/api/pack/${memberId}/note`, { kind, summary, significance });
      setSummary("");
      setKind("conversation");
      setSignificance(0.5);
      onNoted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record interaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="card">
      <div class="card-body">
        <h6 class="card-title">Record Interaction</h6>
        <form onSubmit={handleSubmit}>
          <div class="row g-2 mb-2">
            <div class="col-auto">
              <select
                class="form-select form-select-sm"
                value={kind}
                onChange={(e) => setKind((e.target as HTMLSelectElement).value)}
              >
                {INTERACTION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div class="col">
              <label class="d-flex align-items-center gap-2">
                <span class="form-label mb-0 small text-body-secondary text-nowrap">
                  Significance
                </span>
                <input
                  type="range"
                  class="form-range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={significance}
                  onInput={(e) => setSignificance(Number((e.target as HTMLInputElement).value))}
                />
                <small class="text-body-tertiary" style="min-width: 2em;">
                  {significance.toFixed(1)}
                </small>
              </label>
            </div>
          </div>
          <div class="mb-2">
            <textarea
              class="form-control form-control-sm"
              placeholder="What happened and why it mattered..."
              rows={2}
              value={summary}
              onInput={(e) => setSummary((e.target as HTMLTextAreaElement).value)}
              required
            />
          </div>
          {error && <div class="alert alert-danger py-1 px-2 small">{error}</div>}
          <button type="submit" class="btn btn-info btn-sm" disabled={saving || !summary.trim()}>
            {saving ? "Recording..." : "Record"}
          </button>
        </form>
      </div>
    </div>
  );
}
