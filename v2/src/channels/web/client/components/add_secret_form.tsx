import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import { apiPost } from "../api.ts";

interface AddSecretFormProps {
  onAdded: () => void;
}

export function AddSecretForm({ onAdded }: AddSecretFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const keyRef: RefObject<HTMLInputElement> = useRef(null);
  const valueRef: RefObject<HTMLInputElement> = useRef(null);

  const handleSave = async () => {
    const key = keyRef.current?.value.trim() ?? "";
    const value = valueRef.current?.value.trim() ?? "";
    if (!key || !value) return;

    setSubmitting(true);
    setError("");
    try {
      await apiPost("/api/secrets", { key, value });
      setOpen(false);
      onAdded();
    } catch (err: unknown) {
      setError((err as Error).message);
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
        Add Secret
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
          style="max-width: 200px;"
          // biome-ignore lint/a11y/noAutofocus: intentional for inline form
          autoFocus
        />
        <input
          type="password"
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
