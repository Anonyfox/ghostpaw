import { useCallback, useState } from "preact/hooks";
import type { MemoryInfo } from "../../shared/memory_types.ts";
import { apiPost } from "../api_post.ts";

const SOURCES = [
  { value: "explicit", label: "Direct statement", hint: "confidence 0.9" },
  { value: "observed", label: "Observed behavior", hint: "confidence 0.8" },
  { value: "distilled", label: "Distilled from conversation", hint: "confidence 0.6" },
  { value: "inferred", label: "Inferred / concluded", hint: "confidence 0.5" },
] as const;

const CATEGORIES = [
  { value: "preference", label: "Preference" },
  { value: "fact", label: "Fact" },
  { value: "procedure", label: "Procedure" },
  { value: "capability", label: "Capability" },
  { value: "custom", label: "Custom" },
] as const;

interface MemoryAddFormProps {
  onCreated: (memory: MemoryInfo) => void;
  onCancel: () => void;
}

export function MemoryAddForm({ onCreated, onCancel }: MemoryAddFormProps) {
  const [claim, setClaim] = useState("");
  const [source, setSource] = useState("explicit");
  const [category, setCategory] = useState("preference");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      if (!claim.trim()) return;
      setSaving(true);
      setError(null);
      try {
        const mem = await apiPost<MemoryInfo>("/api/memories", {
          claim: claim.trim(),
          source,
          category,
        });
        onCreated(mem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create memory.");
      } finally {
        setSaving(false);
      }
    },
    [claim, source, category, onCreated],
  );

  return (
    <div class="border rounded p-3 mb-3 bg-body-tertiary">
      <h6 class="text-body mb-3">Add a Memory</h6>
      <form onSubmit={handleSubmit}>
        <div class="mb-3">
          <label class="form-label small text-body-secondary" for="memory-claim">
            What should the ghost remember?
          </label>
          <textarea
            id="memory-claim"
            class="form-control form-control-sm"
            rows={3}
            placeholder="e.g. User prefers dark mode and 2-space indentation"
            value={claim}
            onInput={(e) => setClaim((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        <div class="row g-3 mb-3">
          <div class="col-sm-6">
            <span class="form-label small text-body-secondary d-block">Source</span>
            {SOURCES.map((s) => (
              <div class="form-check" key={s.value}>
                <input
                  class="form-check-input"
                  type="radio"
                  name="memory-source"
                  id={`src-${s.value}`}
                  value={s.value}
                  checked={source === s.value}
                  onChange={() => setSource(s.value)}
                />
                <label class="form-check-label small" for={`src-${s.value}`}>
                  {s.label} <span class="text-body-tertiary">({s.hint})</span>
                </label>
              </div>
            ))}
          </div>

          <div class="col-sm-6">
            <span class="form-label small text-body-secondary d-block">Category</span>
            {CATEGORIES.map((c) => (
              <div class="form-check" key={c.value}>
                <input
                  class="form-check-input"
                  type="radio"
                  name="memory-category"
                  id={`cat-${c.value}`}
                  value={c.value}
                  checked={category === c.value}
                  onChange={() => setCategory(c.value)}
                />
                <label class="form-check-label small" for={`cat-${c.value}`}>
                  {c.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {error && <div class="text-danger small mb-2">{error}</div>}

        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-sm btn-info" disabled={saving || !claim.trim()}>
            {saving ? "Saving..." : "Remember"}
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
