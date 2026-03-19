export interface SecretStatus {
  key: string;
  label: string;
  category: "llm" | "search" | "telegram" | "custom";
  configured: boolean;
  isActiveSearch: boolean;
}

export type { CleanResult, KnownKey } from "../types.ts";
