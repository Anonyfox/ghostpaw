import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { ModelsResponse } from "../../shared/models_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { CACHE_TTL_MS, modelsCache } from "./models_cache.ts";

export function useModelData() {
  const [data, setData] = useState<ModelsResponse | null>(modelsCache.current?.data ?? null);
  const [loading, setLoading] = useState(!modelsCache.current);
  const [error, setError] = useState("");
  const [activating, setActivating] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModels = useCallback(
    (bypassCache = false) => {
      if (
        !bypassCache &&
        modelsCache.current &&
        Date.now() - modelsCache.current.fetchedAt < CACHE_TTL_MS
      ) {
        setData(modelsCache.current.data);
        setLoading(false);
        setError("");
        return;
      }
      setLoading(data === null);
      apiGet<ModelsResponse>("/api/models")
        .then((resp) => {
          modelsCache.current = { data: resp, fetchedAt: Date.now() };
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

  return { data, loading, error, activating, feedback, handleActivate };
}
