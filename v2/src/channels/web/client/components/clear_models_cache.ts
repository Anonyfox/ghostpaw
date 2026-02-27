import { modelsCache } from "./models_cache.ts";

export function clearModelsCache(): void {
  modelsCache.current = null;
}
