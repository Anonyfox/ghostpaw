import { useRef, useState } from "preact/hooks";
import type { TrainerOption } from "../../shared/trainer_types.ts";

interface TrainerOptionsPickerProps {
  options: TrainerOption[];
  onPick: (optionId: string) => void;
  onCustom: (text: string) => void;
  onCancel: () => void;
}

export function TrainerOptionsPicker({
  options,
  onPick,
  onCustom,
  onCancel,
}: TrainerOptionsPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const customRef = useRef<HTMLTextAreaElement>(null);

  const handlePickClick = () => {
    if (selected) onPick(selected);
  };

  const handleCustomSubmit = () => {
    const text = customRef.current?.value.trim();
    if (text) onCustom(text);
  };

  return (
    <div class="mt-3">
      <p class="text-muted small mb-2">Pick an option or provide your own direction:</p>

      <div class="list-group mb-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            class={`list-group-item list-group-item-action ${
              selected === opt.id ? "active" : ""
            }`}
            onClick={() => setSelected(opt.id)}
          >
            <div class="d-flex align-items-start">
              <span class="badge bg-info me-2 mt-1">{opt.id}</span>
              <div>
                <strong>{opt.title}</strong>
                <p class="mb-0 small opacity-75">{opt.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div class="d-flex gap-2 mb-3">
          <button
            type="button"
            class="btn btn-sm btn-info"
            onClick={handlePickClick}
          >
            Apply Selected
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            onClick={() => setSelected(null)}
          >
            Clear Selection
          </button>
        </div>
      )}

      {!selected && (
        <div class="mb-3">
          <textarea
            ref={customRef}
            class="form-control border-secondary mb-2"
            rows={2}
            placeholder="Or describe your own direction..."
          />
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-info"
              onClick={handleCustomSubmit}
            >
              Use Custom Guidance
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
