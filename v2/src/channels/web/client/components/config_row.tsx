import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { apiDelete, apiPost } from "../api.ts";

interface ConfigRowProps {
  config: ConfigInfo;
  onChanged: () => void;
}

export function ConfigRow({ config, onChanged }: ConfigRowProps) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);
  const inputRef: RefObject<HTMLInputElement> = useRef(null);

  const handleSave = async () => {
    const raw = inputRef.current?.value ?? "";
    setSubmitting(true);
    try {
      await apiPost<{ ok: boolean }>("/api/config", {
        key: config.key,
        value: raw,
        ...(config.category === "custom" ? { type: config.type } : {}),
      });
      setEditing(false);
      setFeedback({ type: "success", message: "Saved." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async () => {
    try {
      await apiPost(`/api/config/${encodeURIComponent(config.key)}/undo`);
      setFeedback({ type: "success", message: "Undone." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: errorMessage(err) });
    }
  };

  const handleReset = async () => {
    try {
      await apiDelete(`/api/config/${encodeURIComponent(config.key)}`);
      setFeedback({ type: "success", message: "Reset." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: errorMessage(err) });
    }
  };

  const displayValue =
    config.type === "boolean" ? (config.value === "true" ? "true" : "false") : config.value;

  return (
    <div class="list-group-item">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <span class="fw-medium">{config.label ?? config.key}</span>
          <span class="badge bg-secondary ms-2">{config.type}</span>
          {config.isDefault ? (
            <span class="badge bg-light text-muted ms-1">default</span>
          ) : (
            <span class="badge bg-info ms-1">overridden</span>
          )}
        </div>
        <div class="d-flex align-items-center gap-1">
          {!editing && <span class="text-muted small me-2 font-monospace">{displayValue}</span>}
          {!editing && (
            <>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                onClick={() => {
                  setEditing(true);
                  setFeedback(null);
                }}
              >
                Edit
              </button>
              {!config.isDefault && (
                <>
                  <button type="button" class="btn btn-sm btn-outline-warning" onClick={handleUndo}>
                    Undo
                  </button>
                  <button type="button" class="btn btn-sm btn-outline-danger" onClick={handleReset}>
                    Reset
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {editing && (
        <div class="mt-2">
          <div class="input-group input-group-sm">
            <input
              type="text"
              class="form-control"
              defaultValue={config.value}
              placeholder={`Enter ${config.type} value`}
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
              // biome-ignore lint/a11y/noAutofocus: intentional for inline edit
              autoFocus
            />
            <button
              type="button"
              class="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {feedback && (
        <div class={`alert alert-${feedback.type} mt-2 mb-0 py-1 px-2 small`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
