import { useRef, useState } from "preact/hooks";
import type { ProviderInfo } from "../../shared/provider_info.ts";

interface ProviderCardProps {
  provider: ProviderInfo;
  currentModel: string;
  onActivate: (model: string) => void;
  activating: boolean;
}

export function ProviderCard({
  provider,
  currentModel,
  onActivate,
  activating,
}: ProviderCardProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const [selectedModel, setSelectedModel] = useState(
    provider.isCurrent ? currentModel : (provider.models[0] ?? ""),
  );

  const statusBadge = () => {
    if (provider.isCurrent) return <span class="badge bg-success ms-2">Active</span>;
    if (!provider.hasKey) return <span class="badge bg-secondary ms-2">No Key</span>;
    if (provider.error) return <span class="badge bg-warning text-dark ms-2">Degraded</span>;
    return <span class="badge bg-info ms-2">Ready</span>;
  };

  const sourceBadge = () => {
    if (!provider.hasKey) return null;
    if (provider.modelsSource === "live") {
      return <span class="badge bg-light text-muted">live from API</span>;
    }
    return <span class="badge bg-light text-muted">known models</span>;
  };

  const handleActivate = () => {
    const model = selectRef.current?.value ?? selectedModel;
    if (model) onActivate(model);
  };

  const cardBorder = provider.isCurrent
    ? "border-success"
    : provider.hasKey
      ? ""
      : "border-secondary";

  return (
    <div class={`card h-100 ${cardBorder}`}>
      <div class="card-body d-flex flex-column">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h6 class="card-title mb-0">
            {provider.name}
            {statusBadge()}
          </h6>
          {sourceBadge()}
        </div>

        {provider.hasKey && provider.models.length > 0 ? (
          <select
            ref={selectRef}
            class="form-select form-select-sm mb-3"
            value={selectedModel}
            onChange={(e) => setSelectedModel((e.target as HTMLSelectElement).value)}
            disabled={activating}
          >
            {provider.models.map((m) => (
              <option key={m} value={m}>
                {m}
                {m === currentModel && provider.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <div class="text-muted small mb-3 flex-grow-1">
            {!provider.hasKey ? "No API key configured." : "No models available."}
          </div>
        )}

        <div class="mt-auto">
          {provider.isCurrent ? (
            <button type="button" class="btn btn-sm btn-success w-100" disabled>
              Current
            </button>
          ) : provider.hasKey ? (
            <button
              type="button"
              class="btn btn-sm btn-outline-primary w-100"
              onClick={handleActivate}
              disabled={activating || provider.models.length === 0}
            >
              {activating ? "Switching..." : "Activate"}
            </button>
          ) : (
            <span class="btn btn-sm btn-outline-secondary w-100 disabled">No Key</span>
          )}
        </div>
      </div>
    </div>
  );
}
