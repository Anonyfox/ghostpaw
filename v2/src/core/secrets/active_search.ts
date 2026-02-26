import { KNOWN_KEYS } from "./known_keys.ts";
import type { KnownKey } from "./types.ts";

const SEARCH_PRIORITY = ["BRAVE_API_KEY", "TAVILY_API_KEY", "SERPER_API_KEY"];

export function activeSearchProvider(): KnownKey | null {
  for (const canonical of SEARCH_PRIORITY) {
    if (process.env[canonical]) {
      return KNOWN_KEYS.find((k) => k.canonical === canonical) ?? null;
    }
  }
  return null;
}
