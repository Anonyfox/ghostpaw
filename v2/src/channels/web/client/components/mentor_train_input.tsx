import { useRef } from "preact/hooks";

interface MentorTrainInputProps {
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function MentorTrainInput({ onSubmit, onCancel, disabled = false }: MentorTrainInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = ref.current?.value.trim() ?? "";
    if (trimmed.length > 0 && !disabled) onSubmit(trimmed);
  };

  return (
    <div class="mt-3">
      <textarea
        ref={ref}
        class="form-control border-secondary mb-2"
        rows={3}
        placeholder="What should this soul learn or improve?"
        disabled={disabled}
      />
      <div class="d-flex gap-2">
        <button
          type="button"
          class="btn btn-sm btn-info"
          disabled={disabled}
          onClick={handleSubmit}
        >
          Submit Guidance
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
