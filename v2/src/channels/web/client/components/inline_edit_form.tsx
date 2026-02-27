import type { RefObject } from "preact";

interface InlineEditFormProps {
  inputRef: RefObject<HTMLInputElement>;
  type: "text" | "password";
  defaultValue?: string;
  placeholder: string;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function InlineEditForm(props: InlineEditFormProps) {
  return (
    <div class="mt-2">
      <div class="input-group input-group-sm">
        <input
          type={props.type}
          class="form-control"
          defaultValue={props.defaultValue}
          placeholder={props.placeholder}
          ref={props.inputRef}
          onKeyDown={(e) => {
            if (e.key === "Enter") props.onSave();
            if (e.key === "Escape") props.onCancel();
          }}
          // biome-ignore lint/a11y/noAutofocus: intentional for inline edit
          autoFocus
        />
        <button
          type="button"
          class="btn btn-sm btn-primary"
          onClick={props.onSave}
          disabled={props.submitting}
        >
          {props.submitting ? "Saving..." : "Save"}
        </button>
        <button type="button" class="btn btn-sm btn-secondary" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
