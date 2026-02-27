import type { ModelsResponse } from "../../shared/models_types.ts";

interface CachedResponse {
  data: ModelsResponse;
  fetchedAt: number;
}

export const CACHE_TTL_MS = 60 * 60 * 1000;

// Shared mutable ref so the cache is accessible from both the
// ModelSelector component and the clearModelsCache utility.
export const modelsCache: { current: CachedResponse | null } = { current: null };
