export interface SecretInfo {
  key: string;
  label: string;
  category: "llm" | "search" | "telegram" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}
