import { detectProviderByModel } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database.ts";
import { getConfig } from "../config/index.ts";
import { listSecrets } from "../secrets/index.ts";
import type { ModelFetcher } from "./fetch_provider_models.ts";
import { fetchProviderModels } from "./fetch_provider_models.ts";
import type { ProviderId, ProviderInfo } from "./types.ts";
import {
  isProviderId,
  PROVIDER_DISPLAY_NAMES,
  PROVIDER_IDS,
  PROVIDER_SECRET_KEYS,
} from "./types.ts";

export interface ListProvidersOptions {
  fetchers?: Partial<Record<ProviderId, ModelFetcher>>;
  timeoutMs?: number;
}

export async function listProviders(
  db: DatabaseHandle,
  options?: ListProvidersOptions,
): Promise<ProviderInfo[]> {
  // default_model is a known key with a string default — always returns string
  const currentModel = getConfig(db, "default_model") as string;
  const currentProvider = detectCurrentProvider(currentModel);
  const configuredKeys = new Set(listSecrets(db));

  const results = await Promise.allSettled(
    PROVIDER_IDS.map((id) => fetchSingleProvider(id, configuredKeys, currentProvider, options)),
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
    // chatoyant types the return broadly; we only need the string model IDs
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
