import type { ProviderId } from "chatoyant";
import { isProviderActive } from "chatoyant";
import { PROVIDER_KEYS } from "./known.ts";

export function ensureApiKey(_homePath: string): boolean {
  for (const provider of Object.keys(PROVIDER_KEYS)) {
    if (isProviderActive(provider as ProviderId)) return true;
  }

  console.error("No API key configured.");
  console.error("Set one via: ghostpaw secret set ANTHROPIC_API_KEY sk-ant-...");
  console.error("Or export ANTHROPIC_API_KEY in your shell environment.");
  return false;
}
