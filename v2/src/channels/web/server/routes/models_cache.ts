import type { ProviderInfo } from "../../shared/provider_info.ts";

const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedProviders {
  data: ProviderInfo[];
  fetchedAt: number;
}

let cached: CachedProviders | null = null;

export const modelsCache = {
  get(): ProviderInfo[] | null {
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
      cached = null;
      return null;
    }
    return cached.data;
  },
  set(data: ProviderInfo[]): void {
    cached = { data, fetchedAt: Date.now() };
  },
  invalidate(): void {
    cached = null;
  },
};
