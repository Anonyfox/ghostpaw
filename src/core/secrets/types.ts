export interface KnownKey {
  canonical: string;
  aliases: string[];
  label: string;
  category: "llm" | "search" | "telegram";
}

export interface CleanResult {
  value: string;
  warning?: string;
}
