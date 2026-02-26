import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import { apiDelete, apiPost } from "../api.ts";

export interface SecretInfo {
  key: string;
  label: string;
  category: "llm" | "search" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}

interface SecretRowProps {
  secret: SecretInfo;
  onChanged: () => void;
}

export function SecretRow({ secret, onChanged }: SecretRowProps) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "warning" | "danger";
    message: string;
  } | null>(null);
  const inputRef: RefObject<HTMLInputElement> = useRef(null);

  const handleSave = async () => {
    const value = inputRef.current?.value.trim() ?? "";
    if (!value) return;
    setSubmitting(true);
    try {
      const result = await apiPost<{ ok: boolean; warning?: string }>("/api/secrets", {
        key: secret.key,
        value,
      });
      setEditing(false);
      setFeedback(
        result.warning
          ? { type: "warning", message: result.warning }
          : { type: "success", message: "Saved." },
      );
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    try {
      await apiDelete(`/api/secrets/${encodeURIComponent(secret.key)}`);
      setFeedback({ type: "success", message: "Removed." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: (err as Error).message });
    }
  };

  return (
    <div class="list-group-item">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <span class="fw-medium">{secret.label}</span>
          {secret.isActiveSearch && <span class="badge bg-info ms-2">active</span>}
          {secret.configured ? (
            <span class="badge bg-success ms-2">configured</span>
          ) : (
            <span class="badge bg-secondary ms-2">not set</span>
          )}
        </div>
        <div>
          {!editing && (
            <>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary me-1"
                onClick={() => {
                  setEditing(true);
                  setFeedback(null);
                }}
              >
                {secret.configured ? "Update" : "Set"}
              </button>
              {secret.configured && (
                <button type="button" class="btn btn-sm btn-outline-danger" onClick={handleRemove}>
                  Remove
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {editing && (
        <div class="mt-2">
          <div class="input-group input-group-sm">
            <input
              type="password"
              class="form-control"
              placeholder={`Enter ${secret.label} key`}
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
