import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import { apiDelete } from "../api_delete.ts";
import { apiPost } from "../api_post.ts";
import { FeedbackAlert } from "./feedback_alert.tsx";
import { InlineEditForm } from "./inline_edit_form.tsx";
import type { SecretInfo } from "./secret_info.ts";

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
      <SecretRowHeader
        secret={secret}
        editing={editing}
        onEdit={() => {
          setEditing(true);
          setFeedback(null);
        }}
        onRemove={handleRemove}
      />
      {editing && (
        <InlineEditForm
          inputRef={inputRef}
          type="password"
          placeholder={`Enter ${secret.label} key`}
          submitting={submitting}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
      <FeedbackAlert feedback={feedback} />
    </div>
  );
}

function SecretRowHeader({
  secret,
  editing,
  onEdit,
  onRemove,
}: {
  secret: SecretInfo;
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
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
            <button type="button" class="btn btn-sm btn-outline-primary me-1" onClick={onEdit}>
              {secret.configured ? "Update" : "Set"}
            </button>
            {secret.configured && (
              <button type="button" class="btn btn-sm btn-outline-danger" onClick={onRemove}>
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
