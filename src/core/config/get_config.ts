import type { DatabaseHandle } from "../../lib/index.ts";
import { getCurrentEntry } from "./get_current_entry.ts";
import { KNOWN_CONFIG_KEYS } from "./known_keys.ts";
import { parseConfigValue } from "./parse_value.ts";
import type { ConfigType, ConfigValue } from "./types.ts";

export function getConfig(db: DatabaseHandle, key: string): ConfigValue | null {
  const known = KNOWN_CONFIG_KEYS.find((k) => k.key === key);
  const entry = getCurrentEntry(db, key);

  if (!entry) {
    return known ? known.defaultValue : null;
  }

  const type: ConfigType = known ? known.type : (entry.type as ConfigType);

  try {
    return parseConfigValue(entry.value, type);
  } catch {
    // Corrupted DB value for a known key — fall back to code default rather than crash callers
    if (known) return known.defaultValue;
    throw new Error(`"${entry.value}" is not a valid ${type} for config key "${key}".`);
  }
}
