export const PROVIDER_IDS = ["anthropic", "openai", "xai"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export const MODELS_SOURCES = ["live", "static"] as const;
export type ModelsSource = (typeof MODELS_SOURCES)[number];

export const PROVIDER_DISPLAY_NAMES: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  xai: "xAI",
};

export const PROVIDER_SECRET_KEYS: Record<ProviderId, string> = {
  anthropic: "API_KEY_ANTHROPIC",
  openai: "API_KEY_OPENAI",
  xai: "API_KEY_XAI",
};

export interface FetchResult {
  models: string[];
  source: ModelsSource;
  error?: string;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  hasKey: boolean;
  isCurrent: boolean;
  models: string[];
  modelsSource: ModelsSource;
  error?: string;
}

export type ModelFetcher = (apiKey: string) => Promise<string[]>;

export interface ListProvidersOptions {
  fetchers?: Partial<Record<ProviderId, ModelFetcher>>;
  timeoutMs?: number;
}
