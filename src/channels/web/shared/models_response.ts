import type { ProviderInfo } from "./provider_info.ts";

export interface ModelsResponse {
  currentModel: string;
  currentProvider: string | null;
  providers: ProviderInfo[];
}
