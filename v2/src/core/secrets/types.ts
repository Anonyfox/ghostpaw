export interface KnownKey {
  canonical: string;
  aliases: string[];
  label: string;
  category: "llm" | "search";
}

export interface CleanResult {
  value: string;
  warning?: string;
}
