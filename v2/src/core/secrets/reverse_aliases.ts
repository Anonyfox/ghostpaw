import { PROVIDER_ALIASES } from "./provider_aliases.ts";

export const REVERSE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_ALIASES).map(([alias, canonical]) => [canonical, alias]),
);
