import { useRef } from "preact/hooks";
import type { SkillSummaryInfo } from "../../shared/trainer_types.ts";

interface TrainerInputProps {
  mode: "create" | "train";
  skills?: SkillSummaryInfo[];
  onSubmit: (value: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const CONFIG = {
  create: {
    placeholder: "Focus topic (optional — leave empty for friction mining)",
    submitLabel: "Begin Exploration",
    required: false,
  },
  train: {
    placeholder: "Select a skill to improve",
    submitLabel: "Analyze Skill",
    required: true,
  },
} as const;

export function TrainerInput({
  mode,
  skills,
  onSubmit,
  onCancel,
  disabled = false,
}: TrainerInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const { placeholder, submitLabel, required } = CONFIG[mode];

  const handleSubmit = () => {
    if (mode === "train" && selectRef.current) {
      const val = selectRef.current.value;
      if (val && !disabled) onSubmit(val);
      return;
    }
    const trimmed = ref.current?.value.trim() ?? "";
    if (!required || trimmed.length > 0) {
      if (!disabled) onSubmit(trimmed);
    }
  };

  return (
    <div class="mt-3">
      {mode === "train" && skills && skills.length > 0 ? (
        <select ref={selectRef} class="form-select border-secondary mb-2" disabled={disabled}>
          <option value="">Select a skill...</option>
          {skills.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} ({s.tier}, Rank {s.rank})
            </option>
          ))}
        </select>
      ) : (
        <textarea
          ref={ref}
          class="form-control border-secondary mb-2"
          rows={3}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      <div class="d-flex gap-2">
        <button
          type="button"
          class="btn btn-sm btn-info"
          disabled={disabled}
          onClick={handleSubmit}
        >
          {submitLabel}
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
