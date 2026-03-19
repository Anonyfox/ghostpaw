export interface ProviderInfo {
  id: string;
  name: string;
  hasKey: boolean;
  isCurrent: boolean;
  models: string[];
  modelsSource: "live" | "static";
  error?: string;
}
