import { PROVIDER_ALIASES } from "./provider_aliases.ts";

export function canonicalKeyName(key: string): string {
  return PROVIDER_ALIASES[key] ?? key;
}
