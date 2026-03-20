interface SetupProviderPickerProps {
  selected: string | null;
  onSelect: (provider: string) => void;
  onNext: () => void;
}

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic", desc: "Claude models — recommended for best results" },
  { id: "openai", name: "OpenAI", desc: "GPT models — widely available" },
  { id: "xai", name: "xAI", desc: "Grok models — fast and capable" },
];

export function SetupProviderPicker({ selected, onSelect, onNext }: SetupProviderPickerProps) {
  return (
    <div>
      <h4 class="text-info mb-3">Choose a Provider</h4>
      <p class="text-muted mb-4">Which LLM provider do you want to use?</p>
      <div class="row g-3 mb-4">
        {PROVIDERS.map((p) => (
          <div class="col-12 col-md-4" key={p.id}>
            <button
              type="button"
              class={`card h-100 w-100 text-start ${selected === p.id ? "border-info" : "border"}`}
              style="cursor: pointer; background: none;"
              onClick={() => onSelect(p.id)}
            >
              <div class="card-body text-center">
                <h5 class={`card-title ${selected === p.id ? "text-info" : ""}`}>{p.name}</h5>
                <p class="card-text text-muted small">{p.desc}</p>
              </div>
            </button>
          </div>
        ))}
      </div>
      <button type="button" class="btn btn-primary" disabled={!selected} onClick={onNext}>
        Continue
      </button>
    </div>
  );
}
