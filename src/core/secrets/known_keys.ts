import type { KnownKey } from "./types.ts";

export const KNOWN_KEYS: KnownKey[] = [
  {
    canonical: "API_KEY_ANTHROPIC",
    aliases: ["ANTHROPIC_API_KEY"],
    label: "Anthropic",
    category: "llm",
  },
  { canonical: "API_KEY_OPENAI", aliases: ["OPENAI_API_KEY"], label: "OpenAI", category: "llm" },
  { canonical: "API_KEY_XAI", aliases: ["XAI_API_KEY"], label: "xAI", category: "llm" },
  { canonical: "BRAVE_API_KEY", aliases: [], label: "Brave Search", category: "search" },
  { canonical: "TAVILY_API_KEY", aliases: [], label: "Tavily", category: "search" },
  { canonical: "SERPER_API_KEY", aliases: [], label: "Serper", category: "search" },
  {
    canonical: "TELEGRAM_BOT_TOKEN",
    aliases: [],
    label: "Telegram Bot",
    category: "telegram",
  },
];
