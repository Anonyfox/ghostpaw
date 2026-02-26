import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import { apiPost } from "../api.ts";

const TYPE_OPTIONS = ["string", "integer", "number", "boolean"] as const;
type TypeOption = (typeof TYPE_OPTIONS)[number];

interface AddConfigFormProps {
  onAdded: () => void;
}

export function AddConfigForm({ onAdded }: AddConfigFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<TypeOption>("string");
  const keyRef: RefObject<HTMLInputElement> = useRef(null);
  const valueRef: RefObject<HTMLInputElement> = useRef(null);

  const handleSave = async () => {
    const key = keyRef.current?.value.trim() ?? "";
    const value = valueRef.current?.value ?? "";
    if (!key) return;

    setSubmitting(true);
    setError("");
    try {
      await apiPost("/api/config", { key, value, type });
      setOpen(false);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        Add Custom Config
      </button>
    );
  }

  return (
    <div>
      <div class="input-group input-group-sm">
        <input
          type="text"
          class="form-control"
          placeholder="Key name"
          ref={keyRef}
          style="max-width: 180px;"
          // biome-ignore lint/a11y/noAutofocus: intentional for inline form
          autoFocus
        />
        <select
          class="form-select form-select-sm"
          style="max-width: 110px;"
          value={type}
          onChange={(e) => setType((e.target as HTMLSelectElement).value as TypeOption)}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="text"
          class="form-control"
          placeholder="Value"
          ref={valueRef}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <button
          type="button"
          class="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        <button type="button" class="btn btn-sm btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && <div class="alert alert-danger mt-2 mb-0 py-1 px-2 small">{error}</div>}
    </div>
  );
}
