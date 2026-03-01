import type { DatabaseHandle } from "../../lib/index.ts";
import { getConfig } from "../config/get_config.ts";
import { KNOWN_CONFIG_KEYS } from "../config/known_keys.ts";

const KEY = "soul_trait_limit";
const FALLBACK = (KNOWN_CONFIG_KEYS.find((k) => k.key === KEY)?.defaultValue as number) ?? 10;

export function getTraitLimit(db: DatabaseHandle): number {
  try {
    const value = getConfig(db, KEY) as number;
    return Math.max(1, Math.trunc(value));
  } catch {
    return FALLBACK;
  }
}
