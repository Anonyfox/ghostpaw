import { KNOWN_KEYS } from "./known_keys.ts";

export const PROVIDER_ALIASES: Record<string, string> = Object.fromEntries(
  KNOWN_KEYS.flatMap((k) => k.aliases.map((alias) => [alias, k.canonical])),
);
