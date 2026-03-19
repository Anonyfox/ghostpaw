import type { RefObject } from "preact";
import { useRef, useState } from "preact/hooks";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { FeedbackAlert } from "./feedback_alert.tsx";
import { InlineEditForm } from "./inline_edit_form.tsx";
import { useConfigActions } from "./use_config_actions.ts";

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
  const { handleSave, handleUndo, handleReset } = useConfigActions(
    config,
    inputRef,
    setEditing,
    setSubmitting,
    setFeedback,
    onChanged,
  );

  const displayValue =
    config.type === "boolean" ? (config.value === "true" ? "true" : "false") : config.value;

  return (
    <div class="list-group-item">
      <ConfigRowHeader
        config={config}
        displayValue={displayValue}
        editing={editing}
        onEdit={() => {
          setEditing(true);
          setFeedback(null);
        }}
        onUndo={handleUndo}
        onReset={handleReset}
      />
      {editing && (
        <InlineEditForm
          inputRef={inputRef}
          type="text"
          defaultValue={config.value}
          placeholder={`Enter ${config.type} value`}
          submitting={submitting}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
      <FeedbackAlert feedback={feedback} />
    </div>
  );
}

function ConfigRowHeader({
  config,
  displayValue,
  editing,
  onEdit,
  onUndo,
  onReset,
}: {
  config: ConfigInfo;
  displayValue: string;
  editing: boolean;
  onEdit: () => void;
  onUndo: () => void;
  onReset: () => void;
}) {
  return (
    <div class="d-flex align-items-center justify-content-between">
      <div>
        <div>
          <span class="fw-medium">{config.label ?? config.key}</span>
          <span class="badge bg-secondary ms-2">{config.type}</span>
          {config.isDefault ? (
            <span class="badge bg-body-secondary text-body-tertiary ms-1">default</span>
          ) : (
            <span class="badge bg-info ms-1">overridden</span>
          )}
        </div>
        {config.description && <div class="text-muted small">{config.description}</div>}
      </div>
      <div class="d-flex align-items-center gap-1">
        {!editing && <span class="text-muted small me-2 font-monospace">{displayValue}</span>}
        {!editing && (
          <>
            <button type="button" class="btn btn-sm btn-outline-primary" onClick={onEdit}>
              Edit
            </button>
            {!config.isDefault && (
              <>
                <button type="button" class="btn btn-sm btn-outline-warning" onClick={onUndo}>
                  Undo
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onClick={onReset}>
                  Reset
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
