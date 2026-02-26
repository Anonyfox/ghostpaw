import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ModelsResponse } from "../../shared/models_types.ts";
import { apiGet, apiPost } from "../api.ts";
import { ProviderCard } from "./provider_card.tsx";

interface CachedResponse {
  data: ModelsResponse;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
let modelsCache: CachedResponse | null = null;

export function clearModelsCache(): void {
  modelsCache = null;
}

export function ModelSelector() {
  const [data, setData] = useState<ModelsResponse | null>(modelsCache?.data ?? null);
  const [loading, setLoading] = useState(!modelsCache);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModels = useCallback(
    (bypassCache = false) => {
      if (!bypassCache && modelsCache && Date.now() - modelsCache.fetchedAt < CACHE_TTL_MS) {
        setData(modelsCache.data);
        setLoading(false);
        setError("");
        return;
      }
      setLoading(data === null);
      apiGet<ModelsResponse>("/api/models")
        .then((resp) => {
          modelsCache = { data: resp, fetchedAt: Date.now() };
          setData(resp);
          setLoading(false);
          setError("");
        })
        .catch((err: Error) => {
          setError(err.message);
          setLoading(false);
        });
    },
    [data],
  );

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  const handleActivate = async (model: string) => {
    setActivating(true);
    setFeedback(null);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    try {
      await apiPost<{ ok: boolean; model: string; provider: string }>("/api/models", { model });
      setFeedback({ type: "success", message: `Switched to ${model}` });
      feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
      fetchModels(true);
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: (err as Error).message });
      feedbackTimer.current = setTimeout(() => setFeedback(null), 5000);
    } finally {
      setActivating(false);
    }
  };

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
