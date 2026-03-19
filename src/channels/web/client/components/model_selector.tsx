import { ProviderCard } from "./provider_card.tsx";
import { useModelData } from "./use_model_data.ts";

export function ModelSelector() {
  const { data, loading, error, activating, feedback, handleActivate } = useModelData();
  const noKeysConfigured = data?.providers.every((p) => !p.hasKey);
  const staleModel = data && data.currentProvider === null;

  return (
    <div class="mb-4">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h5 class="mb-0">Active Model</h5>
        <div class="d-flex align-items-center gap-2">
          {feedback && (
            <span class={`badge bg-${feedback.type === "success" ? "success" : "danger"}`}>
              {feedback.message}
            </span>
          )}
          {data && <span class="font-monospace text-muted">{data.currentModel}</span>}
        </div>
      </div>

      {loading && <p class="text-muted">Loading providers...</p>}
      {error && <div class="alert alert-danger">{error}</div>}

      {staleModel && (
        <div class="alert alert-warning mb-3">
          Current model "{data.currentModel}" does not match any known provider. Select a model
          below.
        </div>
      )}

      {noKeysConfigured && (
        <div class="alert alert-info mb-3">
          No API keys configured. Add API keys in the API Keys tab below to enable model selection.
        </div>
      )}

      {data && (
        <div class="row g-3">
          {data.providers.map((p) => (
            <div key={p.id} class="col-md-4">
              <ProviderCard
                provider={p}
                currentModel={data.currentModel}
                onActivate={handleActivate}
                activating={activating}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
