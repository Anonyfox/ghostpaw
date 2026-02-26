import { getModelsForProvider } from "chatoyant";
import type { FetchResult, ProviderId } from "./types.ts";

export type ModelFetcher = (apiKey: string) => Promise<string[]>;

const DEFAULT_TIMEOUT_MS = 5000;

async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  const { listModelIds } = await import("chatoyant/providers/anthropic");
  return listModelIds({ apiKey });
}

async function fetchOpenaiModels(apiKey: string): Promise<string[]> {
  const { listModelIds } = await import("chatoyant/providers/openai");
  return listModelIds({ apiKey });
}

async function fetchXaiModels(apiKey: string): Promise<string[]> {
  const { getLanguageModelList } = await import("chatoyant/providers/xai");
  const models = await getLanguageModelList({ apiKey });
  return models.map((m) => m.id);
}

const DEFAULT_FETCHERS: Record<ProviderId, ModelFetcher> = {
  anthropic: fetchAnthropicModels,
  openai: fetchOpenaiModels,
  xai: fetchXaiModels,
};

export async function fetchProviderModels(
  providerId: ProviderId,
  apiKey: string,
  options?: { timeoutMs?: number; fetcher?: ModelFetcher },
): Promise<FetchResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options?.fetcher ?? DEFAULT_FETCHERS[providerId];

  try {
    const models = await Promise.race([fetcher(apiKey), rejectAfter(timeoutMs)]);
    return { models, source: "live" };
  } catch (err) {
    // chatoyant types the return broadly; we only need the string model IDs
    const fallback = getModelsForProvider(providerId) as string[];
    return {
      models: [...fallback],
      source: "static",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function rejectAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
}
