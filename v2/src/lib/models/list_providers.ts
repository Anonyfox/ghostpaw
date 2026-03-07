import { detectProviderByModel } from "chatoyant";
import { fetchProviderModels } from "./fetch_provider_models.ts";
import type { ListProvidersOptions, ProviderId, ProviderInfo } from "./types.ts";
import {
  isProviderId,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_IDS,
  PROVIDER_SECRET_KEYS,
} from "./types.ts";

export interface ListProvidersParams {
  currentModel: string;
  configuredKeys: Set<string>;
}

export async function listProviders(
  params: ListProvidersParams,
  options?: ListProvidersOptions,
): Promise<ProviderInfo[]> {
  const currentProvider = detectCurrentProvider(params.currentModel);

  const results = await Promise.allSettled(
    PROVIDER_IDS.map((id) =>
      fetchSingleProvider(id, params.configuredKeys, currentProvider, options),
    ),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const id = PROVIDER_IDS[i];
    return {
      id,
      name: PROVIDER_DISPLAY_NAMES[id],
      hasKey: false,
      isCurrent: false,
      models: [],
      modelsSource: "static" as const,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });
}

function detectCurrentProvider(currentModel: string): ProviderId | null {
  try {
    const detected = detectProviderByModel(currentModel);
    if (detected && isProviderId(detected)) return detected;
  } catch {
    // model doesn't match any known provider
  }
  return null;
}

async function fetchSingleProvider(
  id: ProviderId,
  configuredKeys: Set<string>,
  currentProvider: ProviderId | null,
  options?: ListProvidersOptions,
): Promise<ProviderInfo> {
  const secretKey = PROVIDER_SECRET_KEYS[id];
  const hasKey = configuredKeys.has(secretKey);

  if (!hasKey) {
    const { getModelsForProvider } = await import("chatoyant");
    const fallback = getModelsForProvider(id) as string[];
    return {
      id,
      name: PROVIDER_DISPLAY_NAMES[id],
      hasKey: false,
      isCurrent: id === currentProvider,
      models: [...fallback],
      modelsSource: "static",
    };
  }

  const apiKey = process.env[secretKey] ?? "";
  const fetchResult = await fetchProviderModels(id, apiKey, {
    timeoutMs: options?.timeoutMs,
    fetcher: options?.fetchers?.[id],
  });

  return {
    id,
    name: PROVIDER_DISPLAY_NAMES[id],
    hasKey: true,
    isCurrent: id === currentProvider,
    models: fetchResult.models,
    modelsSource: fetchResult.source,
    error: fetchResult.error,
  };
}
