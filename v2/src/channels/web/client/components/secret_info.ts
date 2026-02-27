export interface SecretInfo {
  key: string;
  label: string;
  category: "llm" | "search" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}
