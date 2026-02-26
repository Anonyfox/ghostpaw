export interface ProviderInfo {
  id: string;
  name: string;
  hasKey: boolean;
  isCurrent: boolean;
  models: string[];
  modelsSource: "live" | "static";
  error?: string;
}

export interface ModelsResponse {
  currentModel: string;
  currentProvider: string | null;
  providers: ProviderInfo[];
}
